// Numbers the site quotes about itself, kept in one place so the pages agree.

/**
 * How many technologies the tech stack section can report. The backend guards
 * the real count in backend/internal/parser/tech_count_test.go
 * (advertisedTechCount); raise both together.
 */
export const TECH_COUNT_LABEL = "400+";

export const TECH_COVERAGE =
  `Builders are one part of the answer. Every report also lists the rest of the stack, checked against ${TECH_COUNT_LABEL} technologies: frameworks, CMS and ecommerce platforms, analytics and marketing tools, CDNs and hosting.`;
