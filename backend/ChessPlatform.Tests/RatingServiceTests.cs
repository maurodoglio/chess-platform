using ChessPlatform.Api.Models.Chess;
using ChessPlatform.Api.Services;

namespace ChessPlatform.Tests;

public class RatingServiceTests
{
    private readonly RatingService _sut = new();

    [Fact]
    public void EqualRatings_WhiteWins_WhiteGains()
    {
        var (newWhite, newBlack) = _sut.CalculateNewRatings(1200, 1200, 30, 30, GameResult.WhiteWins);

        Assert.True(newWhite > 1200, "White should gain rating on win");
        Assert.True(newBlack < 1200, "Black should lose rating on loss");
        Assert.Equal(1200 - newBlack, newWhite - 1200); // symmetric for equal K
    }

    [Fact]
    public void EqualRatings_Draw_NoChange()
    {
        var (newWhite, newBlack) = _sut.CalculateNewRatings(1200, 1200, 30, 30, GameResult.Draw);

        Assert.Equal(1200, newWhite);
        Assert.Equal(1200, newBlack);
    }

    [Fact]
    public void ProvisionalK_HigherSwing()
    {
        // Player with <20 games uses K=40, player with >=20 games uses K=20
        var (newWhiteProvisional, _) = _sut.CalculateNewRatings(1200, 1200, 5, 30, GameResult.WhiteWins);
        var (newWhiteEstablished, _) = _sut.CalculateNewRatings(1200, 1200, 30, 30, GameResult.WhiteWins);

        Assert.True(newWhiteProvisional > newWhiteEstablished,
            "Provisional player (K=40) should gain more than established (K=20)");
    }

    [Fact]
    public void RatingFloor_NeverBelow100()
    {
        // Very low rated player losing to very high rated
        var (_, newBlack) = _sut.CalculateNewRatings(2000, 100, 30, 30, GameResult.WhiteWins);

        Assert.True(newBlack >= 100, "Rating should never drop below 100");
    }
}
