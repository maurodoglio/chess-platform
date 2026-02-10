using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChessPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGamesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "games",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    white_player_id = table.Column<Guid>(type: "uuid", nullable: false),
                    black_player_id = table.Column<Guid>(type: "uuid", nullable: false),
                    time_control = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    result = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    termination = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    pgn = table.Column<string>(type: "text", nullable: false),
                    final_fen = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    white_rating_before = table.Column<int>(type: "integer", nullable: false),
                    black_rating_before = table.Column<int>(type: "integer", nullable: false),
                    white_rating_after = table.Column<int>(type: "integer", nullable: false),
                    black_rating_after = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_games", x => x.id);
                    table.ForeignKey(
                        name: "FK_games_users_black_player_id",
                        column: x => x.black_player_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_games_users_white_player_id",
                        column: x => x.white_player_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_games_black_player_id_ended_at",
                table: "games",
                columns: new[] { "black_player_id", "ended_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_games_white_player_id_ended_at",
                table: "games",
                columns: new[] { "white_player_id", "ended_at" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "games");
        }
    }
}
