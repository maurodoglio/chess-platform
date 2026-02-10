using ChessPlatform.Api.Data;
using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;
using Microsoft.EntityFrameworkCore;

namespace ChessPlatform.Api.Services;

public interface IGameCompletionService
{
    Task<(Game game, int whiteRatingChange, int blackRatingChange)?> CompleteGameAsync(
        ActiveGame activeGame, GameResult result, GameTermination termination);
}

public class GameCompletionService : IGameCompletionService
{
    private readonly ChessPlatformDbContext _db;
    private readonly IRatingService _ratingService;
    private readonly IPgnService _pgnService;
    private readonly ILogger<GameCompletionService> _logger;

    public GameCompletionService(
        ChessPlatformDbContext db,
        IRatingService ratingService,
        IPgnService pgnService,
        ILogger<GameCompletionService> logger)
    {
        _db = db;
        _ratingService = ratingService;
        _pgnService = pgnService;
        _logger = logger;
    }

    public async Task<(Game game, int whiteRatingChange, int blackRatingChange)?> CompleteGameAsync(
        ActiveGame activeGame, GameResult result, GameTermination termination)
    {
        if (termination == GameTermination.Abort)
            return null;

        var whitePlayer = await _db.Users.FirstOrDefaultAsync(u => u.Id == activeGame.WhitePlayerId);
        var blackPlayer = await _db.Users.FirstOrDefaultAsync(u => u.Id == activeGame.BlackPlayerId);

        if (whitePlayer == null || blackPlayer == null)
        {
            _logger.LogError("Could not find players for game {GameId}", activeGame.Id);
            return null;
        }

        var timeControl = TimeControls.Get(activeGame.TimeControlId);
        var category = timeControl?.Category ?? "blitz";

        var (whiteRating, whiteGamesPlayed) = GetRatingAndGames(whitePlayer, category);
        var (blackRating, blackGamesPlayed) = GetRatingAndGames(blackPlayer, category);

        var (newWhiteRating, newBlackRating) = _ratingService.CalculateNewRatings(
            whiteRating, blackRating, whiteGamesPlayed, blackGamesPlayed, result);

        var resultStr = MapResult(result);
        var pgn = _pgnService.GeneratePgn(activeGame, resultStr, whitePlayer.DisplayName, blackPlayer.DisplayName);

        var game = new Game
        {
            Id = activeGame.Id,
            WhitePlayerId = activeGame.WhitePlayerId,
            BlackPlayerId = activeGame.BlackPlayerId,
            TimeControl = activeGame.TimeControlId,
            Result = resultStr,
            Termination = MapTermination(termination),
            Pgn = pgn,
            FinalFen = activeGame.CurrentFen,
            WhiteRatingBefore = whiteRating,
            BlackRatingBefore = blackRating,
            WhiteRatingAfter = newWhiteRating,
            BlackRatingAfter = newBlackRating,
            StartedAt = activeGame.StartedAt,
            EndedAt = DateTime.UtcNow
        };

        _db.Games.Add(game);

        SetRatingAndGames(whitePlayer, category, newWhiteRating, whiteGamesPlayed + 1);
        SetRatingAndGames(blackPlayer, category, newBlackRating, blackGamesPlayed + 1);
        whitePlayer.UpdatedAt = DateTime.UtcNow;
        blackPlayer.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        int whiteRatingChange = newWhiteRating - whiteRating;
        int blackRatingChange = newBlackRating - blackRating;

        _logger.LogInformation(
            "Game {GameId} completed: {Result} by {Termination}. White {WhiteRating}->{NewWhiteRating}, Black {BlackRating}->{NewBlackRating}",
            game.Id, resultStr, termination, whiteRating, newWhiteRating, blackRating, newBlackRating);

        return (game, whiteRatingChange, blackRatingChange);
    }

    private static (int rating, int gamesPlayed) GetRatingAndGames(User user, string category) => category switch
    {
        "bullet" => (user.RatingBullet, user.GamesPlayedBullet),
        "blitz" => (user.RatingBlitz, user.GamesPlayedBlitz),
        "rapid" => (user.RatingRapid, user.GamesPlayedRapid),
        _ => (user.RatingBlitz, user.GamesPlayedBlitz)
    };

    private static void SetRatingAndGames(User user, string category, int rating, int gamesPlayed)
    {
        switch (category)
        {
            case "bullet":
                user.RatingBullet = rating;
                user.GamesPlayedBullet = gamesPlayed;
                break;
            case "blitz":
                user.RatingBlitz = rating;
                user.GamesPlayedBlitz = gamesPlayed;
                break;
            case "rapid":
                user.RatingRapid = rating;
                user.GamesPlayedRapid = gamesPlayed;
                break;
        }
    }

    private static string MapResult(GameResult result) => result switch
    {
        GameResult.WhiteWins => "1-0",
        GameResult.BlackWins => "0-1",
        GameResult.Draw => "1/2-1/2",
        _ => "1/2-1/2"
    };

    private static string MapTermination(GameTermination termination) => termination switch
    {
        GameTermination.Checkmate => "checkmate",
        GameTermination.Stalemate => "stalemate",
        GameTermination.Resignation => "resignation",
        GameTermination.Timeout => "timeout",
        GameTermination.DrawAgreement => "draw_agreement",
        GameTermination.ThreefoldRepetition => "threefold_repetition",
        GameTermination.FiftyMoveRule => "fifty_move_rule",
        GameTermination.InsufficientMaterial => "insufficient_material",
        _ => "unknown"
    };
}
