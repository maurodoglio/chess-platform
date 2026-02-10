using ChessPlatform.Api.Models;
using ChessPlatform.Api.Services;

namespace ChessPlatform.Tests;

public class MatchmakingServiceTests
{
    private readonly MatchmakingService _service = new();

    private QueueEntry CreateEntry(Guid? userId = null, int rating = 1200,
        string timeControlId = "blitz_5_0", DateTime? joinedAt = null)
    {
        return new QueueEntry
        {
            UserId = userId ?? Guid.NewGuid(),
            ConnectionId = $"conn-{Guid.NewGuid()}",
            Rating = rating,
            TimeControlId = timeControlId,
            JoinedAt = joinedAt ?? DateTime.UtcNow
        };
    }

    [Fact]
    public void JoinQueue_Succeeds()
    {
        var entry = CreateEntry();

        Assert.True(_service.JoinQueue(entry));
        Assert.True(_service.IsInQueue(entry.UserId));
    }

    [Fact]
    public void JoinQueue_DuplicateRejected()
    {
        var userId = Guid.NewGuid();
        var entry1 = CreateEntry(userId: userId);
        var entry2 = CreateEntry(userId: userId);

        Assert.True(_service.JoinQueue(entry1));
        Assert.False(_service.JoinQueue(entry2));
    }

    [Fact]
    public void LeaveQueue_RemovesEntry()
    {
        var entry = CreateEntry();
        _service.JoinQueue(entry);

        Assert.True(_service.LeaveQueue(entry.UserId));
        Assert.False(_service.IsInQueue(entry.UserId));
    }

    [Fact]
    public void FindMatches_PairsCloseRatedPlayers()
    {
        var entry1 = CreateEntry(rating: 1200);
        var entry2 = CreateEntry(rating: 1250);

        _service.JoinQueue(entry1);
        _service.JoinQueue(entry2);

        var matches = _service.FindMatches();

        Assert.Single(matches);
        var (p1, p2) = matches[0];
        Assert.Contains(p1.UserId, new[] { entry1.UserId, entry2.UserId });
        Assert.Contains(p2.UserId, new[] { entry1.UserId, entry2.UserId });
        Assert.NotEqual(p1.UserId, p2.UserId);

        // Both removed from queue
        Assert.False(_service.IsInQueue(entry1.UserId));
        Assert.False(_service.IsInQueue(entry2.UserId));
    }

    [Fact]
    public void FindMatches_DoesNotPairDifferentTimeControls()
    {
        var entry1 = CreateEntry(rating: 1200, timeControlId: "blitz_5_0");
        var entry2 = CreateEntry(rating: 1200, timeControlId: "rapid_10_0");

        _service.JoinQueue(entry1);
        _service.JoinQueue(entry2);

        var matches = _service.FindMatches();

        Assert.Empty(matches);
        Assert.True(_service.IsInQueue(entry1.UserId));
        Assert.True(_service.IsInQueue(entry2.UserId));
    }

    [Fact]
    public void FindMatches_DoesNotPairDistantRatingsBeforeExpansion()
    {
        // Both just joined, so allowed range is ±100
        var entry1 = CreateEntry(rating: 1200, joinedAt: DateTime.UtcNow);
        var entry2 = CreateEntry(rating: 1400, joinedAt: DateTime.UtcNow);

        _service.JoinQueue(entry1);
        _service.JoinQueue(entry2);

        var matches = _service.FindMatches();

        Assert.Empty(matches);
        Assert.True(_service.IsInQueue(entry1.UserId));
        Assert.True(_service.IsInQueue(entry2.UserId));
    }
}
