namespace ChessPlatform.Api.Models.Chess;

public class MoveResult
{
    public bool IsLegal { get; set; }
    public string? Error { get; set; }
    public string Fen { get; set; } = string.Empty;
    public string San { get; set; } = string.Empty;
    public bool IsCheck { get; set; }
    public bool IsCapture { get; set; }
    public bool IsCastle { get; set; }
    public GameResult GameResult { get; set; } = GameResult.InProgress;
    public GameTermination Termination { get; set; } = GameTermination.None;
}
