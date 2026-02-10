using System.Collections.Concurrent;

namespace ChessPlatform.Api.Services;

public interface IConnectionTracker
{
    void AddConnection(Guid userId, string connectionId);
    void RemoveConnection(string connectionId);
    string? GetConnectionId(Guid userId);
    Guid? GetUserId(string connectionId);
    bool IsConnected(Guid userId);
}

public class ConnectionTracker : IConnectionTracker
{
    private readonly ConcurrentDictionary<Guid, string> _userConnections = new();
    private readonly ConcurrentDictionary<string, Guid> _connectionUsers = new();

    public void AddConnection(Guid userId, string connectionId)
    {
        // Remove existing connection for this user
        if (_userConnections.TryGetValue(userId, out var oldConnectionId))
        {
            _connectionUsers.TryRemove(oldConnectionId, out _);
        }

        _userConnections[userId] = connectionId;
        _connectionUsers[connectionId] = userId;
    }

    public void RemoveConnection(string connectionId)
    {
        if (_connectionUsers.TryRemove(connectionId, out var userId))
        {
            _userConnections.TryRemove(userId, out _);
        }
    }

    public string? GetConnectionId(Guid userId)
    {
        return _userConnections.TryGetValue(userId, out var connectionId) ? connectionId : null;
    }

    public Guid? GetUserId(string connectionId)
    {
        return _connectionUsers.TryGetValue(connectionId, out var userId) ? userId : null;
    }

    public bool IsConnected(Guid userId)
    {
        return _userConnections.ContainsKey(userId);
    }
}
