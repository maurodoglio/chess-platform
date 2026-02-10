using ChessPlatform.Api.Models;
using ChessPlatform.Api.Models.Chess;

namespace ChessPlatform.Api.Services;

public interface IGameStateManager
{
    ActiveGame CreateGame(Guid whitePlayerId, string whiteConnectionId,
                          Guid blackPlayerId, string blackConnectionId,
                          string timeControlId);
    ActiveGame? GetGame(Guid gameId);
    ActiveGame? GetGameByPlayer(Guid playerId);
    MoveResult TryMakeMove(Guid gameId, Guid playerId, string uciMove);
    (GameResult result, GameTermination termination) Resign(Guid gameId, Guid playerId);
    bool OfferDraw(Guid gameId, Guid playerId);
    bool AcceptDraw(Guid gameId, Guid playerId);
    bool DeclineDraw(Guid gameId, Guid playerId);
    bool CanAbort(Guid gameId);
    void AbortGame(Guid gameId);
    void RemoveGame(Guid gameId);
    void UpdateConnectionId(Guid gameId, Guid playerId, string newConnectionId);
    IEnumerable<ActiveGame> GetAllActiveGames();
}
