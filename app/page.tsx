import Dashboard from "./components/Dashboard";
import { SAMPLE_PROPERTIES, SAMPLE_BUYERS } from "./lib/sample-data";
import {
  buildScoredDeals,
  buildMarketSummary,
  attachBuyerMatches,
  alertDeals,
} from "./lib/deals";

export default function Home() {
  // Until live data sources (RentCast / MLS / public records) are wired in,
  // the platform runs on realistic Las Vegas sample data so every feature is
  // explorable. Swapping in a real feed only changes this data source.
  const scored = buildScoredDeals(SAMPLE_PROPERTIES);
  const deals = attachBuyerMatches(scored, SAMPLE_BUYERS);
  const summary = buildMarketSummary(scored);
  const alerts = attachBuyerMatches(alertDeals(scored), SAMPLE_BUYERS);

  return (
    <Dashboard
      deals={deals}
      summary={summary}
      buyers={SAMPLE_BUYERS}
      alerts={alerts}
    />
  );
}
