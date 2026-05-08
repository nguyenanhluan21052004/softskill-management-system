using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Soff_skil.Migrations
{
    /// <inheritdoc />
    public partial class SoftSkillDashboardModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "teachers",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_teachers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    username = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    password = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "students",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    class_code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    teacher_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_students", x => x.id);
                    table.ForeignKey(
                        name: "FK_students_teachers_teacher_id",
                        column: x => x.teacher_id,
                        principalTable: "teachers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_students_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "academic_data",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    student_id = table.Column<int>(type: "int", nullable: false),
                    gpa = table.Column<double>(type: "float", nullable: false),
                    deadline_rate = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_academic_data", x => x.id);
                    table.ForeignKey(
                        name: "FK_academic_data_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "soft_skill_result",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    student_id = table.Column<int>(type: "int", nullable: false),
                    communication = table.Column<double>(type: "float", nullable: false),
                    teamwork = table.Column<double>(type: "float", nullable: false),
                    critical_thinking = table.Column<double>(type: "float", nullable: false),
                    time_management = table.Column<double>(type: "float", nullable: false),
                    participation_rate = table.Column<double>(type: "float", nullable: false),
                    contribution_rate = table.Column<double>(type: "float", nullable: false),
                    on_time_rate = table.Column<double>(type: "float", nullable: false),
                    score = table.Column<double>(type: "float", nullable: false),
                    level = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_soft_skill_result", x => x.id);
                    table.CheckConstraint("CK_soft_skill_result_communication", "[communication] >= 0 AND [communication] <= 10");
                    table.CheckConstraint("CK_soft_skill_result_contribution_rate", "[contribution_rate] >= 0 AND [contribution_rate] <= 100");
                    table.CheckConstraint("CK_soft_skill_result_critical_thinking", "[critical_thinking] >= 0 AND [critical_thinking] <= 10");
                    table.CheckConstraint("CK_soft_skill_result_on_time_rate", "[on_time_rate] >= 0 AND [on_time_rate] <= 100");
                    table.CheckConstraint("CK_soft_skill_result_participation_rate", "[participation_rate] >= 0 AND [participation_rate] <= 100");
                    table.CheckConstraint("CK_soft_skill_result_teamwork", "[teamwork] >= 0 AND [teamwork] <= 10");
                    table.CheckConstraint("CK_soft_skill_result_time_management", "[time_management] >= 0 AND [time_management] <= 10");
                    table.ForeignKey(
                        name: "FK_soft_skill_result_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "teamwork_data",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    student_id = table.Column<int>(type: "int", nullable: false),
                    peer_review = table.Column<double>(type: "float", nullable: false),
                    participation = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_teamwork_data", x => x.id);
                    table.ForeignKey(
                        name: "FK_teamwork_data_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "teachers",
                columns: new[] { "id", "email", "name", "user_id" },
                values: new object[] { 1, "teacher@school.com", "Nguyen Van A", 2 });

            migrationBuilder.InsertData(
                table: "users",
                columns: new[] { "id", "password", "role", "username" },
                values: new object[,]
                {
                    { 1, "admin123", "admin", "admin" },
                    { 2, "teacher123", "teacher", "teacher" },
                    { 101, "123456", "student", "sv001" },
                    { 102, "123456", "student", "sv002" },
                    { 103, "123456", "student", "sv003" },
                    { 104, "123456", "student", "sv004" },
                    { 105, "123456", "student", "sv005" },
                    { 106, "123456", "student", "sv006" },
                    { 107, "123456", "student", "sv007" },
                    { 108, "123456", "student", "sv008" },
                    { 109, "123456", "student", "sv009" },
                    { 110, "123456", "student", "sv010" }
                });

            migrationBuilder.InsertData(
                table: "students",
                columns: new[] { "id", "class_code", "name", "teacher_id", "user_id" },
                values: new object[,]
                {
                    { 1, "SV001", "Tran Van H", 1, 101 },
                    { 2, "SV002", "Le Thi M", 1, 102 },
                    { 3, "SV003", "Pham Quang T", 1, 103 },
                    { 4, "SV004", "Vu Hoang N", 1, 104 },
                    { 5, "SV005", "Bui Gia K", 1, 105 },
                    { 6, "SV006", "Do Minh C", 1, 106 },
                    { 7, "SV007", "Dang Thu P", 1, 107 },
                    { 8, "SV008", "Nguyen Duc Q", 1, 108 },
                    { 9, "SV009", "Hoang Linh Y", 1, 109 },
                    { 10, "SV010", "Tran Bao U", 1, 110 }
                });

            migrationBuilder.InsertData(
                table: "soft_skill_result",
                columns: new[] { "id", "communication", "contribution_rate", "critical_thinking", "level", "on_time_rate", "participation_rate", "score", "student_id", "teamwork", "time_management" },
                values: new object[,]
                {
                    { 1, 8.4000000000000004, 86.0, 8.1999999999999993, "Good", 90.0, 82.0, 8.4100000000000001, 1, 8.8000000000000007, 8.0999999999999996 },
                    { 2, 7.5, 80.0, 7.2000000000000002, "Average", 84.0, 77.0, 7.4199999999999999, 2, 7.7999999999999998, 7.0 },
                    { 3, 5.7999999999999998, 61.0, 5.5, "Weak", 68.0, 63.0, 5.6699999999999999, 3, 6.0, 5.2000000000000002 },
                    { 4, 9.0, 90.0, 8.9000000000000004, "Good", 94.0, 91.0, 8.7899999999999991, 4, 8.6999999999999993, 8.5 },
                    { 5, 6.7999999999999998, 70.0, 6.2999999999999998, "Average", 76.0, 72.0, 6.6100000000000003, 5, 6.5, 6.9000000000000004 },
                    { 6, 7.0999999999999996, 74.0, 6.9000000000000004, "Average", 79.0, 75.0, 7.0800000000000001, 6, 7.0, 7.4000000000000004 },
                    { 7, 8.1999999999999993, 83.0, 7.9000000000000004, "Good", 88.0, 85.0, 8.1099999999999994, 7, 8.0, 8.4000000000000004 },
                    { 8, 4.9000000000000004, 55.0, 5.0, "Weak", 60.0, 58.0, 5.0, 8, 5.2000000000000002, 4.7999999999999998 },
                    { 9, 6.2000000000000002, 73.0, 6.0999999999999996, "Average", 72.0, 70.0, 6.3200000000000003, 9, 6.7999999999999998, 6.0 },
                    { 10, 7.9000000000000004, 82.0, 7.7000000000000002, "Average", 85.0, 80.0, 7.8499999999999996, 10, 8.0999999999999996, 7.5999999999999996 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_academic_data_student_id",
                table: "academic_data",
                column: "student_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_soft_skill_result_student_id",
                table: "soft_skill_result",
                column: "student_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_students_class_code",
                table: "students",
                column: "class_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_students_teacher_id",
                table: "students",
                column: "teacher_id");

            migrationBuilder.CreateIndex(
                name: "IX_students_user_id",
                table: "students",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_teachers_email",
                table: "teachers",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_teamwork_data_student_id",
                table: "teamwork_data",
                column: "student_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_username",
                table: "users",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "academic_data");

            migrationBuilder.DropTable(
                name: "soft_skill_result");

            migrationBuilder.DropTable(
                name: "teamwork_data");

            migrationBuilder.DropTable(
                name: "students");

            migrationBuilder.DropTable(
                name: "teachers");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
