using Microsoft.EntityFrameworkCore;
using Soff_skil.Models;

namespace Soff_skil.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Student> Students => Set<Student>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<Classroom> Classes => Set<Classroom>();
    public DbSet<StudentActivity> StudentActivities => Set<StudentActivity>();
    public DbSet<Evaluation> Evaluations => Set<Evaluation>();
    public DbSet<EvaluationDetail> EvaluationDetails => Set<EvaluationDetail>();
    public DbSet<ProgressTracking> ProgressTrackings => Set<ProgressTracking>();
    public DbSet<Recommendation> Recommendations => Set<Recommendation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Student>(entity =>
        {
            entity.ToTable("students");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(e => e.ClassCode).HasColumnName("class_code").HasMaxLength(20).IsRequired();
            entity.Property(e => e.TeacherId).HasColumnName("teacher_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasOne(e => e.Teacher)
                .WithMany(e => e.Students)
                .HasForeignKey(e => e.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithOne(e => e.Student)
                .HasForeignKey<Student>(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Classroom)
                .WithMany(e => e.Students)
                .HasForeignKey(e => e.ClassCode)
                .HasPrincipalKey(e => e.Code)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Evaluations)
                .WithOne(e => e.Student)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Activities)
                .WithOne(e => e.Student)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.ProgressTrackings)
                .WithOne(e => e.Student)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Recommendations)
                .WithOne(e => e.Student)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Username).HasColumnName("username").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Password).HasColumnName("password").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).IsRequired();

            entity.HasIndex(e => e.Username).IsUnique();
        });

        modelBuilder.Entity<Teacher>(entity =>
        {
            entity.ToTable("teachers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(200).IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<Classroom>(entity =>
        {
            entity.ToTable("classes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(e => e.TeacherId).HasColumnName("teacher_id");
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(20).IsRequired();

            entity.HasIndex(e => e.Code).IsUnique();

            entity.HasOne(e => e.Teacher)
                .WithMany(e => e.Classes)
                .HasForeignKey(e => e.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StudentActivity>(entity =>
        {
            entity.ToTable("student_activities");
            entity.HasKey(e => e.ActivityId);
            entity.Property(e => e.ActivityId).HasColumnName("activity_id");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.WeekNumber).HasColumnName("week_number");
            entity.Property(e => e.Attendance).HasColumnName("attendance");
            entity.Property(e => e.Assignment).HasColumnName("assignment");
            entity.Property(e => e.Presentation).HasColumnName("presentation");
            entity.Property(e => e.Project).HasColumnName("project");
            entity.Property(e => e.PeerReview).HasColumnName("peer_review");
            entity.Property(e => e.TeamContribution).HasColumnName("team_contribution");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(e => new { e.StudentId, e.WeekNumber }).IsUnique();
        });

        modelBuilder.Entity<Evaluation>(entity =>
        {
            entity.ToTable("evaluations");
            entity.HasKey(e => e.EvaluationId);
            entity.Property(e => e.EvaluationId).HasColumnName("evaluation_id");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.EvaluatorId).HasColumnName("evaluator_id");
            entity.Property(e => e.EvaluatorType).HasColumnName("evaluator_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.WeekNumber).HasColumnName("week_number");
            entity.Property(e => e.EvaluationDate).HasColumnName("evaluation_date");
            entity.Property(e => e.Comment).HasColumnName("comment").HasMaxLength(500);

            entity.HasMany(e => e.Details)
                .WithOne(e => e.Evaluation)
                .HasForeignKey(e => e.EvaluationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EvaluationDetail>(entity =>
        {
            entity.ToTable("evaluation_details");
            entity.HasKey(e => e.DetailId);
            entity.Property(e => e.DetailId).HasColumnName("detail_id");
            entity.Property(e => e.EvaluationId).HasColumnName("evaluation_id");
            entity.Property(e => e.SkillType).HasColumnName("skill_type").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Score).HasColumnName("score");
            entity.Property(e => e.Weight).HasColumnName("weight");
            entity.Property(e => e.Comment).HasColumnName("comment").HasMaxLength(500);
            entity.HasIndex(e => e.EvaluationId);
        });

        modelBuilder.Entity<ProgressTracking>(entity =>
        {
            entity.ToTable("progress_tracking");
            entity.HasKey(e => e.ProgressId);
            entity.Property(e => e.ProgressId).HasColumnName("progress_id");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.WeekNumber).HasColumnName("week_number");
            entity.Property(e => e.TotalScore).HasColumnName("total_score");
            entity.Property(e => e.Rank).HasColumnName("rank");
            entity.Property(e => e.AlertFlag).HasColumnName("alert_flag");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(e => new { e.StudentId, e.WeekNumber }).IsUnique();
        });

        modelBuilder.Entity<Recommendation>(entity =>
        {
            entity.ToTable("recommendations");
            entity.HasKey(e => e.RecommendationId);
            entity.Property(e => e.RecommendationId).HasColumnName("recommendation_id");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.SkillType).HasColumnName("skill_type").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Suggestion).HasColumnName("suggestion").HasMaxLength(500).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => e.StudentId);
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasData(
            new User { Id = 1, Username = "admin", Password = "admin123", Role = "admin" },
            new User { Id = 2, Username = "teacher", Password = "teacher123", Role = "teacher" },
            new User { Id = 101, Username = "sv001", Password = "123456", Role = "student" },
            new User { Id = 102, Username = "sv002", Password = "123456", Role = "student" },
            new User { Id = 103, Username = "sv003", Password = "123456", Role = "student" },
            new User { Id = 104, Username = "sv004", Password = "123456", Role = "student" },
            new User { Id = 105, Username = "sv005", Password = "123456", Role = "student" },
            new User { Id = 106, Username = "sv006", Password = "123456", Role = "student" },
            new User { Id = 107, Username = "sv007", Password = "123456", Role = "student" },
            new User { Id = 108, Username = "sv008", Password = "123456", Role = "student" },
            new User { Id = 109, Username = "sv009", Password = "123456", Role = "student" },
            new User { Id = 110, Username = "sv010", Password = "123456", Role = "student" }
        );

        modelBuilder.Entity<Teacher>().HasData(
            new Teacher { Id = 1, Name = "Nguyen Van A", Email = "teacher@school.com", UserId = 2 }
        );

        modelBuilder.Entity<Classroom>().HasData(
            new Classroom { Id = 1, Name = "22CT112", Code = "22CT112", TeacherId = 1 }
        );

        modelBuilder.Entity<Student>().HasData(
            new Student { Id = 1, Name = "Tran Van H", ClassCode = "22CT112", TeacherId = 1, UserId = 101 },
            new Student { Id = 2, Name = "Le Thi M", ClassCode = "22CT112", TeacherId = 1, UserId = 102 },
            new Student { Id = 3, Name = "Pham Quang T", ClassCode = "22CT112", TeacherId = 1, UserId = 103 },
            new Student { Id = 4, Name = "Vu Hoang N", ClassCode = "22CT112", TeacherId = 1, UserId = 104 },
            new Student { Id = 5, Name = "Bui Gia K", ClassCode = "22CT112", TeacherId = 1, UserId = 105 },
            new Student { Id = 6, Name = "Do Minh C", ClassCode = "22CT112", TeacherId = 1, UserId = 106 },
            new Student { Id = 7, Name = "Dang Thu P", ClassCode = "22CT112", TeacherId = 1, UserId = 107 },
            new Student { Id = 8, Name = "Nguyen Duc Q", ClassCode = "22CT112", TeacherId = 1, UserId = 108 },
            new Student { Id = 9, Name = "Hoang Linh Y", ClassCode = "22CT112", TeacherId = 1, UserId = 109 },
            new Student { Id = 10, Name = "Tran Bao U", ClassCode = "22CT112", TeacherId = 1, UserId = 110 }
        );

    }
}
