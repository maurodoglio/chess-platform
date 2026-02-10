namespace ChessPlatform.Api.Models.Chess;

public enum GameTermination
{
    None,
    Checkmate,
    Stalemate,
    Resignation,
    Timeout,
    DrawAgreement,
    ThreefoldRepetition,
    FiftyMoveRule,
    InsufficientMaterial,
    Abort
}
