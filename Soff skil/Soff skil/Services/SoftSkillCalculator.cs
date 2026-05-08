using Soff_skil.DTOs;
using Soff_skil.Models;

namespace Soff_skil.Services;

public static class SoftSkillCalculator
{
    public const double AlertThreshold = 5.0;
    public const double CommunicationWeight = 0.25;
    public const double TeamworkWeight = 0.30;
    public const double CriticalThinkingWeight = 0.25;
    public const double TimeManagementWeight = 0.20;
    public const string LevelGood = "Tốt";
    public const string LevelAverage = "Trung bình";
    public const string LevelWeak = "Yếu";
    private const double MaxDashboardScore = 10.0;

    public static double CalculateWeightedScore(IEnumerable<EvaluationDetail> details)
    {
        var detailList = details.ToList();
        if (detailList.Count == 0)
        {
            return 0;
        }

        var totalWeight = detailList.Sum(d => NormalizeWeight(d.Weight));
        if (totalWeight <= 0)
        {
            return 0;
        }

        var score = detailList.Sum(d => NormalizeSkill(d.Score) * NormalizeWeight(d.Weight)) / totalWeight;
        return Math.Round(score, 2);
    }

    public static double CalculateWeightedScore(IEnumerable<EvaluationDetailDto> details)
    {
        var detailList = details.ToList();
        if (detailList.Count == 0)
        {
            return 0;
        }

        var totalWeight = detailList.Sum(d => NormalizeWeight(d.Weight));
        if (totalWeight <= 0)
        {
            return 0;
        }

        var score = detailList.Sum(d => NormalizeSkill(d.Score) * NormalizeWeight(d.Weight)) / totalWeight;
        return Math.Round(score, 2);
    }

    public static string ClassifyLevel(double score)
    {
        if (score >= 8)
        {
            return LevelGood;
        }

        if (score >= 6.5)
        {
            return LevelAverage;
        }

        return LevelWeak;
    }

    public static double CalculateCommunication(double presentation, double assignment, double peerReview)
    {
        var normalizedPresentation = NormalizeSkill(presentation);
        var normalizedAssignment = NormalizeSkill(assignment);
        var normalizedPeerReview = NormalizeSkill(peerReview);
        var score = normalizedPresentation * 0.4 + normalizedAssignment * 0.3 + normalizedPeerReview * 0.3;
        return Math.Round(score, 2);
    }

    public static double CalculateTeamwork(double peerReview, double teamContribution, double project)
    {
        var normalizedPeerReview = NormalizeSkill(peerReview);
        var normalizedTeamContribution = NormalizeSkill(teamContribution);
        var normalizedProject = NormalizeSkill(project);
        var score = normalizedPeerReview * 0.5 + normalizedTeamContribution * 0.3 + normalizedProject * 0.2;
        return Math.Round(score, 2);
    }

    public static double CalculateCriticalThinking(double assignment, double project)
    {
        var normalizedAssignment = NormalizeSkill(assignment);
        var normalizedProject = NormalizeSkill(project);
        var score = (normalizedAssignment + normalizedProject) / 2;
        return Math.Round(score, 2);
    }

    public static double CalculateTimeManagement(double attendance, double assignment)
    {
        var normalizedAttendance = NormalizeSkill(attendance);
        var normalizedAssignment = NormalizeSkill(assignment);
        var score = (normalizedAttendance + normalizedAssignment) / 2;
        return Math.Round(score, 2);
    }

    public static double CalculateFinalScore(
        double communication,
        double teamwork,
        double criticalThinking,
        double timeManagement)
    {
        var score = communication * CommunicationWeight
            + teamwork * TeamworkWeight
            + criticalThinking * CriticalThinkingWeight
            + timeManagement * TimeManagementWeight;
        return Math.Round(score, 2);
    }

    public static double NormalizeSkill(double value)
    {
        return Math.Round(Math.Clamp(value, 0, 10), 2);
    }

    public static double NormalizeDashboardScore(double score)
    {
        return Math.Round(Math.Clamp(score, 0, MaxDashboardScore), 2);
    }

    public static string BuildSuggestion(string skillType)
    {
        return skillType.ToLowerInvariant() switch
        {
            "communication" => "Cần tăng thuyết trình nhóm",
            "teamwork" => "Cần cải thiện kỹ năng làm việc nhóm",
            "criticalthinking" => "Rèn luyện tư duy phản biện",
            "critical_thinking" => "Rèn luyện tư duy phản biện",
            "time management" => "Cải thiện quản lý thời gian",
            "time_management" => "Cải thiện quản lý thời gian",
            "timemanagement" => "Cải thiện quản lý thời gian",
            _ => $"Cải thiện kỹ năng {skillType}"
        };
    }

    private static double NormalizeWeight(double weight)
    {
        return weight > 0 ? weight : 1;
    }
}
