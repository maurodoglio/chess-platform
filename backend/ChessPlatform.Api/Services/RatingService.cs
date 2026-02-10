using ChessPlatform.Api.Models.Chess;

namespace ChessPlatform.Api.Services;

public interface IRatingService
{
    (int newWhiteRating, int newBlackRating) CalculateNewRatings(
        int whiteRating, int blackRating,
        int whiteGamesPlayed, int blackGamesPlayed,
        GameResult result);
}

public class RatingService : IRatingService
{
    public (int newWhiteRating, int newBlackRating) CalculateNewRatings(
        int whiteRating, int blackRating,
        int whiteGamesPlayed, int blackGamesPlayed,
        GameResult result)
    {
        double whiteScore = result switch
        {
            GameResult.WhiteWins => 1.0,
            GameResult.BlackWins => 0.0,
            _ => 0.5
        };
        double blackScore = 1.0 - whiteScore;

        double whiteExpected = ExpectedScore(whiteRating, blackRating);
        double blackExpected = ExpectedScore(blackRating, whiteRating);

        int whiteK = GetKFactor(whiteGamesPlayed, whiteRating);
        int blackK = GetKFactor(blackGamesPlayed, blackRating);

        int newWhite = Math.Max(100, (int)Math.Round(whiteRating + whiteK * (whiteScore - whiteExpected)));
        int newBlack = Math.Max(100, (int)Math.Round(blackRating + blackK * (blackScore - blackExpected)));

        return (newWhite, newBlack);
    }

    private static double ExpectedScore(int playerRating, int opponentRating)
    {
        return 1.0 / (1.0 + Math.Pow(10, (opponentRating - playerRating) / 400.0));
    }

    private static int GetKFactor(int gamesPlayed, int rating)
    {
        if (gamesPlayed < 20) return 40;
        if (rating >= 2400) return 10;
        return 20;
    }
}
