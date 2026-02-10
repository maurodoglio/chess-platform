using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;

namespace ChessPlatform.Api.Services;

public class ClockUpdateResult
{
    public long TimeWhiteMs { get; set; }
    public long TimeBlackMs { get; set; }
    public bool Flagged { get; set; }
    public Guid? FlaggedPlayerId { get; set; }
}

public interface IClockService
{
    ClockUpdateResult UpdateClockOnMove(ActiveGame game);
    List<(Guid gameId, Guid flaggedPlayerId)> CheckFlags(IEnumerable<ActiveGame> activeGames);
}

public class ClockService : IClockService
{
    public ClockUpdateResult UpdateClockOnMove(ActiveGame game)
    {
        var now = DateTime.UtcNow;

        // First move: start the clock but don't deduct time
        if (game.MoveCount == 1)
        {
            game.ClockRunning = true;
            game.LastMoveTimestamp = now;
            return new ClockUpdateResult
            {
                TimeWhiteMs = game.TimeWhiteMs,
                TimeBlackMs = game.TimeBlackMs,
                Flagged = false
            };
        }

        // Subsequent moves: deduct elapsed time from the mover's clock
        var elapsed = (now - game.LastMoveTimestamp!.Value).TotalMilliseconds;
        elapsed = Math.Max(0, elapsed - 100); // 100ms latency grace

        // Turn has already been toggled, so the mover is the OPPOSITE of current turn
        var moverIsWhite = game.Turn == Color.Black;
        var moverPlayerId = moverIsWhite ? game.WhitePlayerId : game.BlackPlayerId;

        if (moverIsWhite)
            game.TimeWhiteMs -= (long)elapsed;
        else
            game.TimeBlackMs -= (long)elapsed;

        var result = new ClockUpdateResult();

        // Check for flag
        var moverTime = moverIsWhite ? game.TimeWhiteMs : game.TimeBlackMs;
        if (moverTime <= 0)
        {
            if (moverIsWhite)
                game.TimeWhiteMs = 0;
            else
                game.TimeBlackMs = 0;

            result.Flagged = true;
            result.FlaggedPlayerId = moverPlayerId;
        }
        else
        {
            // Add increment only if not flagged
            if (moverIsWhite)
                game.TimeWhiteMs += game.IncrementMs;
            else
                game.TimeBlackMs += game.IncrementMs;
        }

        game.LastMoveTimestamp = now;

        result.TimeWhiteMs = game.TimeWhiteMs;
        result.TimeBlackMs = game.TimeBlackMs;
        return result;
    }

    public List<(Guid gameId, Guid flaggedPlayerId)> CheckFlags(IEnumerable<ActiveGame> activeGames)
    {
        var flagged = new List<(Guid gameId, Guid flaggedPlayerId)>();
        var now = DateTime.UtcNow;

        foreach (var game in activeGames)
        {
            if (!game.ClockRunning || game.Status != GameStatus.Active || game.LastMoveTimestamp == null)
                continue;

            var elapsed = (now - game.LastMoveTimestamp.Value).TotalMilliseconds;

            // The running clock belongs to the player whose turn it currently is
            var currentPlayerTime = game.Turn == Color.White ? game.TimeWhiteMs : game.TimeBlackMs;

            if (currentPlayerTime - (long)elapsed <= 0)
            {
                flagged.Add((game.Id, game.CurrentPlayerId));
            }
        }

        return flagged;
    }
}
