-- Seed newsletter registry with popular newsletters across industries
-- Run after newsletter_registry table is created

INSERT INTO newsletter_registry (name, description, website_url, industry_tags, ingestion_method, feed_url, status) VALUES

-- Finance & Investing
('Money Stuff by Matt Levine', 'Daily Wall Street finance, deals, regulation, and corporate absurdity from Bloomberg Opinion', 'https://www.bloomberg.com/authors/ARbTQlRLRjE/matthew-s-levine', '["finance","wall-street","regulation","deals"]', 'system_email', NULL, 'pending_admin_setup'),
('The Daily Upside', 'Business and finance news explained for professionals — deals, markets, macro', 'https://www.thedailyupside.com', '["finance","business","markets"]', 'system_email', NULL, 'pending_admin_setup'),
('Chartr', 'Data-driven business and finance insights through charts and visual storytelling', 'https://www.chartr.co', '["finance","data","business"]', 'system_email', NULL, 'pending_admin_setup'),
('Mauldin Economics', 'Macro economics and investment analysis for institutional and sophisticated investors', 'https://www.mauldineconomics.com', '["finance","macro","investing"]', 'system_email', NULL, 'pending_admin_setup'),

-- Tech & Startups
('Stratechery by Ben Thompson', 'Technology strategy and business analysis — platforms, aggregation theory, big tech', 'https://stratechery.com', '["tech","strategy","platforms"]', 'rss', 'https://stratechery.com/feed/', 'active'),
('The Pragmatic Engineer by Gergely Orosz', 'Software engineering, tech industry, and engineering management insights', 'https://newsletter.pragmaticengineer.com', '["tech","engineering","management"]', 'rss', 'https://newsletter.pragmaticengineer.com/feed', 'active'),
('Newcomer by Eric Newcomer', 'Venture capital, startup fundraising, and Silicon Valley dealmaking', 'https://www.newcomer.co', '["tech","venture-capital","startups"]', 'rss', 'https://www.newcomer.co/feed', 'active'),
('Not Boring by Packy McCormick', 'Business strategy, tech trends, and company deep-dives with an optimistic lens', 'https://www.notboring.co', '["tech","strategy","startups"]', 'rss', 'https://www.notboring.co/feed', 'active'),
('Lenny''s Newsletter', 'Product management, growth, and building consumer and B2B products', 'https://www.lennysnewsletter.com', '["tech","product-management","growth"]', 'rss', 'https://www.lennysnewsletter.com/feed', 'active'),
('The Generalist by Mario Gabriele', 'Deep-dive profiles of important companies, technologies, and trends', 'https://www.generalist.com', '["tech","business","analysis"]', 'rss', 'https://www.generalist.com/feed', 'active'),
('CB Insights', 'Technology market intelligence — funding trends, emerging tech, industry analysis', 'https://www.cbinsights.com', '["tech","venture-capital","market-intelligence"]', 'system_email', NULL, 'pending_admin_setup'),

-- Policy & Government
('POLITICO Playbook', 'Daily political intelligence — Congress, White House, campaign updates', 'https://www.politico.com/playbook', '["policy","politics","government"]', 'system_email', NULL, 'pending_admin_setup'),
('Punchbowl News', 'Congressional and Capitol Hill insider coverage for policy professionals', 'https://punchbowl.news', '["policy","congress","legislation"]', 'system_email', NULL, 'pending_admin_setup'),
('The Dispatch', 'Conservative policy analysis and factual reporting on politics and culture', 'https://thedispatch.com', '["policy","politics","analysis"]', 'rss', 'https://thedispatch.com/feed/', 'active'),

-- Healthcare & Life Sciences
('STAT News Morning Rounds', 'Daily health and life sciences news for pharma, biotech, and healthcare professionals', 'https://www.statnews.com', '["healthcare","pharma","biotech"]', 'system_email', NULL, 'pending_admin_setup'),
('Endpoints News', 'Biopharma industry coverage — drug development, FDA, clinical trials', 'https://endpts.com', '["healthcare","pharma","biotech","fda"]', 'system_email', NULL, 'pending_admin_setup'),

-- Energy & Climate
('Heatmap News', 'Climate economy coverage — energy transition, climate tech, sustainability business', 'https://www.heatmap.news', '["energy","climate","sustainability"]', 'system_email', NULL, 'pending_admin_setup'),
('BloombergNEF', 'Clean energy, transport, commodities, and carbon market data and analysis', 'https://about.bnef.com', '["energy","clean-tech","commodities"]', 'system_email', NULL, 'pending_admin_setup'),

-- Real Estate
('The Real Deal', 'Commercial and residential real estate news, deals, and market analysis', 'https://therealdeal.com', '["real-estate","commercial","deals"]', 'system_email', NULL, 'pending_admin_setup'),
('Bisnow', 'Commercial real estate intelligence — deals, development, market trends', 'https://www.bisnow.com', '["real-estate","commercial","development"]', 'system_email', NULL, 'pending_admin_setup'),

-- Legal
('The American Lawyer', 'Law firm business, major litigation, legal industry trends', 'https://www.law.com/americanlawyer/', '["legal","law-firms","litigation"]', 'system_email', NULL, 'pending_admin_setup'),
('Law360', 'Legal news across practice areas — M&A, IP, regulatory, employment', 'https://www.law360.com', '["legal","regulation","litigation"]', 'system_email', NULL, 'pending_admin_setup'),

-- AI & Data
('Import AI by Jack Clark', 'Weekly AI research, policy, and industry developments from Anthropic co-founder', 'https://importai.substack.com', '["ai","research","policy"]', 'rss', 'https://importai.substack.com/feed', 'active'),
('The Batch by Andrew Ng', 'Weekly AI news and practical insights curated by deeplearning.ai', 'https://www.deeplearning.ai/the-batch/', '["ai","machine-learning","data-science"]', 'system_email', NULL, 'pending_admin_setup'),

-- General Business
('Morning Brew', 'Daily business news digest in a conversational tone — markets, tech, economy', 'https://www.morningbrew.com', '["business","markets","general"]', 'system_email', NULL, 'pending_admin_setup'),
('The Hustle', 'Business and tech trends explained for entrepreneurs and professionals', 'https://thehustle.co', '["business","tech","entrepreneurship"]', 'system_email', NULL, 'pending_admin_setup'),
('Axios Pro Rata', 'Deals, venture capital, private equity, and M&A intelligence', 'https://www.axios.com/newsletters/axios-pro-rata', '["business","venture-capital","deals","private-equity"]', 'system_email', NULL, 'pending_admin_setup')

ON CONFLICT DO NOTHING;
