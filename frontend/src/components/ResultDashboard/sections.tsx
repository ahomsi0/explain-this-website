import type { AnalysisResult } from "../../types/analysis";
import { OverviewCard }          from "../cards/OverviewCard";
import { TechStackCard }         from "../cards/TechStackCard";
import { SEOAuditCard }          from "../cards/SeoAuditCard";
import { ConversionCard, TrustEngagementCard } from "../cards/ConversionCard";
import { ConversionScoreCard }   from "../cards/ConversionScoreCard";
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
import { AdvancedSection } from "../ui/AdvancedSection";

export type SectionId = "overview" | "fixplan" | "tech" | "seo" | "ux" | "performance" | "conversion";

export type SectionMeta = {
  id: SectionId;
  label: string;
  title: string;
  description: string;
};

export const SECTIONS: SectionMeta[] = [
  { id: "overview",    label: "Overview",    title: "Audit Overview",
    description: "A high-level snapshot of the site, what it's for, and the most impactful issues to fix." },
  { id: "fixplan",     label: "Fix Plan",    title: "Your Fix Plan",
    description: "Prioritized issues ranked by impact × severity. Start here to get the most value." },
  { id: "tech",        label: "Tech Stack",  title: "Technology Stack",
    description: "Frameworks, analytics, CDNs, and platforms detected on the page." },
  { id: "seo",         label: "SEO Audit",   title: "SEO Audit",
    description: "13 critical SEO checks with pass/fail status and actionable details." },
  { id: "ux",          label: "UX Review",   title: "User Experience",
    description: "Conversion-relevant UX signals, trust markers, and engagement features." },
  { id: "performance", label: "Performance", title: "Performance & Loading",
    description: "Real Core Web Vitals from Google, plus load efficiency and content stats." },
  { id: "conversion",  label: "Conversion",  title: "Conversion Readiness",
    description: "How clear the offer is, how trustworthy it feels, and where friction lives." },
];

export function SectionView({ id, result }: { id: SectionId; result: AnalysisResult }) {
  switch (id) {
    case "overview": {
      const insights = computeInsights(result);
      return (
        <div className="flex flex-col gap-2">
          <ExecutiveSummaryCard insights={insights} />
          <OverviewCard
            overview={result.overview}
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
          <AdvancedSection>
            <SiteFreshnessCard freshness={result.siteFreshness} />
            {result.domainInfo && <DomainInfoCard domainInfo={result.domainInfo} />}
          </AdvancedSection>
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
          <AdvancedSection>
            <IntentAlignmentCard intentAlignment={result.intentAlignment} />
          </AdvancedSection>
        </div>
      );

    case "ux":
      return (
        <div className="flex flex-col gap-2">
          <CustomerViewCard customerView={result.customerView} />
          <ConversionCard ux={result.ux} />
          <VagueLanguageCard copyAnalysis={result.copyAnalysis} />
          <AdvancedSection>
            <ColorPaletteCard colorPalette={result.colorPalette} />
          </AdvancedSection>
        </div>
      );

    case "performance":
      return (
        <div className="flex flex-col gap-2">
          {result.performance?.available && <PerformanceCard performance={result.performance} />}
          {result.pageStats && <PagePerfCard pageStats={result.pageStats} />}
          <ImageAuditCard audit={result.imageAudit} />
          <AdvancedSection>
            {result.pageStats && <PageStatsCard pageStats={result.pageStats} />}
            {result.contentStats && <ContentCard contentStats={result.contentStats} />}
            {result.fontAudit && <FontAuditCard fontAudit={result.fontAudit} />}
          </AdvancedSection>
        </div>
      );

    case "conversion":
      return (
        <div className="flex flex-col gap-2">
          <ConversionScoreCard scores={result.conversionScores} />
          <TrustEngagementCard ux={result.ux} />
        </div>
      );
  }
}
