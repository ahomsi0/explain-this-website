import type { AnalysisResult } from "../../types/analysis";
import { AISummaryCard }         from "../cards/AISummaryCard";
import { OverviewCard }          from "../cards/OverviewCard";
import { TechStackCard }         from "../cards/TechStackCard";
import { SEOAuditCard }          from "../cards/SeoAuditCard";
import { ConversionCard, TrustEngagementCard } from "../cards/ConversionCard";
import { ConversionScoreCard }   from "../cards/ConversionScoreCard";
import { ConversionBlockersCard } from "../cards/ConversionBlockersCard";
import { WeakPointsCard }        from "../cards/WeakPointsCard";
import { RecommendationsCard }   from "../cards/RecommendationsCard";
import { PageStatsCard, PagePerfCard } from "../cards/PageStatsCard";
import { ContentCard }           from "../cards/ContentCard";
import { InsightCard }           from "../cards/InsightCard";
import { CustomerViewCard }      from "../cards/CustomerViewCard";
import { ELI5Card }              from "../cards/ELI5Card";
import { PerformanceCard }       from "../cards/PerformanceCard";
import { ActionableOpportunitiesCard } from "../cards/ActionableOpportunitiesCard";
import { ImageAuditCard }        from "../cards/ImageAuditCard";
import { SiteFreshnessCard }     from "../cards/SiteFreshnessCard";
import { FontAuditCard }         from "../cards/FontAuditCard";
import { DomainInfoCard }        from "../cards/DomainInfoCard";
import { SecurityHeadersCard }   from "../cards/SecurityHeadersCard";
import { LinkCheckCard }         from "../cards/LinkCheckCard";
import { ColorPaletteCard }      from "../cards/ColorPaletteCard";
import { VagueLanguageCard }     from "../cards/VagueLanguageCard";
import { IntentAlignmentCard }   from "../cards/IntentAlignmentCard";
import { computeInsights } from "../../utils/insights";
import { ExecutiveSummaryCard } from "../cards/ExecutiveSummaryCard";
import { FixPlanCard } from "../cards/FixPlanCard";
import type { SectionId } from "./sectionConfig";

export function SectionView({ id, result }: { id: SectionId; result: AnalysisResult }) {
  switch (id) {
    case "overview": {
      const insights = computeInsights(result);
      return (
        <div className="flex flex-col gap-2">
          <AISummaryCard summary={result.aiSummary} />
          <ExecutiveSummaryCard insights={insights} />
          <OverviewCard
            overview={result.overview}
            rendering={result.rendering}
            url={result.url}
            fetchedAt={result.fetchedAt}
            aiDetection={result.aiDetection}
          />
          <InsightCard
            intent={result.intent}
            biggestOpportunity={result.biggestOpportunity}
            competitorInsight={result.competitorInsight}
          />
          {(result.eli5 ?? []).length > 0 && <ELI5Card items={result.eli5 ?? []} />}
          <ActionableOpportunitiesCard issues={result.prioritizedIssues ?? []} />
          <WeakPointsCard weakPoints={result.weakPoints ?? []} />
          <RecommendationsCard recommendations={result.recommendations ?? []} />
          <SiteFreshnessCard freshness={result.siteFreshness} />
          {result.domainInfo && <DomainInfoCard domainInfo={result.domainInfo} />}
        </div>
      );
    }

    case "fixplan": {
      const insights = computeInsights(result);
      return (
        <div className="flex flex-col gap-2">
          <FixPlanCard issues={insights.allIssues} />
        </div>
      );
    }

    case "tech":
      return (
        <div className="flex flex-col gap-2">
          <TechStackCard techStack={result.techStack} />
        </div>
      );

    case "seo":
      return (
        <div className="flex flex-col gap-2">
          <SEOAuditCard seoChecks={result.seoChecks} />
          <SecurityHeadersCard checks={result.securityHeaders} />
          <LinkCheckCard linkCheck={result.linkCheck} />
          <IntentAlignmentCard intentAlignment={result.intentAlignment} />
        </div>
      );

    case "ux":
      return (
        <div className="flex flex-col gap-2">
          <CustomerViewCard customerView={result.customerView} />
          <ConversionCard ux={result.ux} />
          <VagueLanguageCard copyAnalysis={result.copyAnalysis} />
          <ColorPaletteCard colorPalette={result.colorPalette} />
        </div>
      );

    case "performance":
      return (
        <div className="flex flex-col gap-2">
          {result.performance?.available && <PerformanceCard performance={result.performance} />}
          {result.pageStats && <PagePerfCard pageStats={result.pageStats} />}
          <ImageAuditCard audit={result.imageAudit} />
          {result.pageStats && <PageStatsCard pageStats={result.pageStats} />}
          {result.contentStats && <ContentCard contentStats={result.contentStats} />}
          {result.fontAudit && <FontAuditCard fontAudit={result.fontAudit} />}
        </div>
      );

    case "conversion":
      return (
        <div className="flex flex-col gap-2">
          <ConversionBlockersCard scores={result.conversionScores} ux={result.ux} />
          <ConversionScoreCard scores={result.conversionScores} />
          <TrustEngagementCard ux={result.ux} />
        </div>
      );
  }
}
