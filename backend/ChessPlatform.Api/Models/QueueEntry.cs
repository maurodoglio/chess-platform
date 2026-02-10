namespace ChessPlatform.Api.Models;

public class QueueEntry
{
    public Guid UserId { get; set; }
    public string ConnectionId { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string TimeControlId { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}
