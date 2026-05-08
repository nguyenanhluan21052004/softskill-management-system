using Soff_skil.DTOs;

namespace Soff_skil.Services
{
    public interface ISoftSkillService
    {
        // =====================================================
        // DASHBOARD RESULTS
        // =====================================================

        /// <summary>
        /// Lấy toàn bộ kết quả soft skill mới nhất của sinh viên
        /// </summary>
        Task<IReadOnlyList<SoftSkillResultDto>> GetResultsAsync(
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Lấy top sinh viên có điểm cao nhất
        /// </summary>
        Task<IReadOnlyList<SoftSkillResultDto>> GetTopResultsAsync(
            int limit,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Thống kê tổng quan hệ thống
        /// </summary>
        Task<SoftSkillStatisticsDto> GetStatisticsAsync(
            CancellationToken cancellationToken = default);


        // =====================================================
        // CREATE EVALUATION
        // =====================================================

        /// <summary>
        /// Tạo đánh giá mới cho sinh viên
        /// </summary>
        Task<EvaluationCreateResponseDto> CreateEvaluationAsync(
            EvaluationCreateRequestDto request,
            CancellationToken cancellationToken = default);


        // =====================================================
        // STUDENT DASHBOARD
        // =====================================================

        /// <summary>
        /// Lấy tiến độ học tập / kỹ năng mềm của sinh viên
        /// </summary>
        Task<StudentProgressDto?> GetStudentProgressAsync(
            int studentId,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Lấy danh sách gợi ý cải thiện kỹ năng
        /// </summary>
        Task<IReadOnlyList<RecommendationDto>> GetRecommendationsAsync(
            int studentId,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Lấy toàn bộ lịch sử đánh giá của 1 sinh viên
        /// </summary>
        Task<IReadOnlyList<CreateEvaluationDto>> GetEvaluationsByStudentAsync(
            int studentId,
            CancellationToken cancellationToken = default);
    }
}