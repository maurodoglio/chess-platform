namespace ChessPlatform.Api.Models;

public record TimeControlConfig(string Id, string Name, string Category, int BaseTimeMs, int IncrementMs);

public static class TimeControls
{
    public static readonly Dictionary<string, TimeControlConfig> All = new()
    {
        ["bullet_1_0"] = new("bullet_1_0", "Bullet 1+0", "bullet", 60_000, 0),
        ["bullet_2_1"] = new("bullet_2_1", "Bullet 2+1", "bullet", 120_000, 1_000),
        ["blitz_3_0"] = new("blitz_3_0", "Blitz 3+0", "blitz", 180_000, 0),
        ["blitz_5_0"] = new("blitz_5_0", "Blitz 5+0", "blitz", 300_000, 0),
        ["blitz_5_2"] = new("blitz_5_2", "Blitz 5+2", "blitz", 300_000, 2_000),
        ["rapid_10_0"] = new("rapid_10_0", "Rapid 10+0", "rapid", 600_000, 0),
        ["rapid_15_10"] = new("rapid_15_10", "Rapid 15+10", "rapid", 900_000, 10_000),
    };

    public static TimeControlConfig? Get(string id) => All.GetValueOrDefault(id);
}
