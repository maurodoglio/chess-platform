using System.Collections.Concurrent;
using ChessPlatform.Api.Models;

namespace ChessPlatform.Api.Services;

public interface IMatchmakingService
{
    bool JoinQueue(QueueEntry entry);
    bool LeaveQueue(Guid userId);
    bool IsInQueue(Guid userId);
    List<(QueueEntry Player1, QueueEntry Player2)> FindMatches();
}

public class MatchmakingService : IMatchmakingService
{
    private readonly ConcurrentDictionary<Guid, QueueEntry> _queue = new();

    public bool JoinQueue(QueueEntry entry)
    {
        return _queue.TryAdd(entry.UserId, entry);
    }

    public bool LeaveQueue(Guid userId)
    {
        return _queue.TryRemove(userId, out _);
    }

    public bool IsInQueue(Guid userId)
    {
        return _queue.ContainsKey(userId);
    }

    public List<(QueueEntry Player1, QueueEntry Player2)> FindMatches()
    {
        var matches = new List<(QueueEntry, QueueEntry)>();
        var snapshot = _queue.Values.ToList();
        var matched = new HashSet<Guid>();

        var groups = snapshot.GroupBy(e => e.TimeControlId);

        foreach (var group in groups)
        {
            var entries = group.OrderBy(e => e.JoinedAt).ToList();

            for (int i = 0; i < entries.Count; i++)
            {
                if (matched.Contains(entries[i].UserId))
                    continue;

                var entry = entries[i];
                var waitSeconds = (DateTime.UtcNow - entry.JoinedAt).TotalSeconds;
                var expansion = (int)(waitSeconds / 5) * 50;
                var allowedRange = Math.Min(100 + expansion, 500);

                QueueEntry? bestMatch = null;
                int bestDiff = int.MaxValue;

                for (int j = i + 1; j < entries.Count; j++)
                {
                    if (matched.Contains(entries[j].UserId))
                        continue;

                    var candidate = entries[j];
                    var candidateWaitSeconds = (DateTime.UtcNow - candidate.JoinedAt).TotalSeconds;
                    var candidateExpansion = (int)(candidateWaitSeconds / 5) * 50;
                    var candidateAllowedRange = Math.Min(100 + candidateExpansion, 500);

                    var ratingDiff = Math.Abs(entry.Rating - candidate.Rating);

                    if (ratingDiff <= allowedRange && ratingDiff <= candidateAllowedRange)
                    {
                        if (ratingDiff < bestDiff)
                        {
                            bestDiff = ratingDiff;
                            bestMatch = candidate;
                        }
                    }
                }

                if (bestMatch != null)
                {
                    matched.Add(entry.UserId);
                    matched.Add(bestMatch.UserId);
                    matches.Add((entry, bestMatch));
                }
            }
        }

        // Remove matched players from the queue
        foreach (var userId in matched)
        {
            _queue.TryRemove(userId, out _);
        }

        return matches;
    }
}
