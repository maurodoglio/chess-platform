using ChessPlatform.Api.Models.Chess;

namespace ChessPlatform.Api.Models;

public enum DrawOfferState { None, OfferedByWhite, OfferedByBlack }
public enum GameStatus { Active, Completed }

public class ActiveGame
{
    public Guid Id { get; set; }
    public Guid WhitePlayerId { get; set; }
    public Guid BlackPlayerId { get; set; }
    public string? WhiteConnectionId { get; set; }
    public string? BlackConnectionId { get; set; }
    public string CurrentFen { get; set; } = string.Empty;
    public List<string> MoveHistory { get; set; } = new();   // UCI moves
    public List<string> SanHistory { get; set; } = new();    // SAN moves
    public List<string> PositionHistory { get; set; } = new(); // FEN positions for repetition detection
    public Color Turn { get; set; } = Color.White;
    public long TimeWhiteMs { get; set; }
    public long TimeBlackMs { get; set; }
    public int IncrementMs { get; set; }
    public string TimeControlId { get; set; } = string.Empty;
    public DateTime? LastMoveTimestamp { get; set; }
    public DrawOfferState DrawOffer { get; set; } = DrawOfferState.None;
    public GameStatus Status { get; set; } = GameStatus.Active;
    public int MoveCount { get; set; }
    public DateTime StartedAt { get; set; }
    public bool ClockRunning { get; set; }

    public Guid CurrentPlayerId => Turn == Color.White ? WhitePlayerId : BlackPlayerId;
    public Guid GetOpponentId(Guid playerId) => playerId == WhitePlayerId ? BlackPlayerId : WhitePlayerId;
    public Color PlayerColor(Guid playerId) => playerId == WhitePlayerId ? Color.White : Color.Black;
    public bool IsPlayer(Guid playerId) => playerId == WhitePlayerId || playerId == BlackPlayerId;
}
