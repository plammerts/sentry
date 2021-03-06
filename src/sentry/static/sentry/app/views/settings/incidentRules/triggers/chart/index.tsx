import React from 'react';
import maxBy from 'lodash/maxBy';
import styled from '@emotion/styled';

import {Client} from 'app/api';
import {Organization, Project} from 'app/types';
import {Panel} from 'app/components/panels';
import {SeriesDataUnit} from 'app/types/echarts';
import EventsRequest from 'app/views/events/utils/eventsRequest';
import {getDisplayForAlertRuleAggregation} from 'app/views/alerts/utils';
import LoadingMask from 'app/components/loadingMask';
import Placeholder from 'app/components/placeholder';
import space from 'app/styles/space';

import {AlertRuleAggregations, IncidentRule, TimeWindow, Trigger} from '../../types';
import ThresholdsChart from './thresholdsChart';

type Props = {
  api: Client;
  organization: Organization;
  projects: Project[];

  query: IncidentRule['query'];
  timeWindow: IncidentRule['timeWindow'];
  aggregation: IncidentRule['aggregation'];
  triggers: Trigger[];
};

/**
 * This is a chart to be used in Metric Alert rules that fetches events based on
 * query, timewindow, and aggregations.
 */
class TriggersChart extends React.PureComponent<Props> {
  render() {
    const {
      api,
      organization,
      projects,
      timeWindow,
      query,
      aggregation,
      triggers,
    } = this.props;

    const period = getPeriodForTimeWindow(timeWindow);

    return (
      <EventsRequest
        api={api}
        organization={organization}
        query={query}
        project={projects.map(({id}) => Number(id))}
        interval={`${timeWindow}m`}
        period={period}
        yAxis={aggregation === AlertRuleAggregations.TOTAL ? 'event_count' : 'user_count'}
        includePrevious={false}
        currentSeriesName={getDisplayForAlertRuleAggregation(aggregation)}
      >
        {({loading, reloading, timeseriesData}) => {
          let maxValue: SeriesDataUnit | undefined;
          if (timeseriesData && timeseriesData.length && timeseriesData[0].data) {
            maxValue = maxBy(timeseriesData[0].data, ({value}) => value);
          }

          return (
            <StickyWrapper>
              <PanelNoMargin>
                {loading ? (
                  <Placeholder height="200px" />
                ) : (
                  <React.Fragment>
                    <TransparentLoadingMask visible={reloading} />
                    <ThresholdsChart
                      period={period}
                      maxValue={maxValue ? maxValue.value : maxValue}
                      data={timeseriesData}
                      triggers={triggers}
                    />
                  </React.Fragment>
                )}
              </PanelNoMargin>
            </StickyWrapper>
          );
        }}
      </EventsRequest>
    );
  }
}

export default TriggersChart;

type TimeWindowMapType = {[key in TimeWindow]: string};

const TIME_WINDOW_TO_PERIOD: TimeWindowMapType = {
  [TimeWindow.ONE_MINUTE]: '12h',
  [TimeWindow.FIVE_MINUTES]: '12h',
  [TimeWindow.TEN_MINUTES]: '1d',
  [TimeWindow.FIFTEEN_MINUTES]: '3d',
  [TimeWindow.THIRTY_MINUTES]: '3d',
  [TimeWindow.ONE_HOUR]: '7d',
  [TimeWindow.TWO_HOURS]: '7d',
  [TimeWindow.FOUR_HOURS]: '7d',
  [TimeWindow.ONE_DAY]: '14d',
};

/**
 * Gets a reasonable period given a time window (in minutes)
 *
 * @param timeWindow The time window in minutes
 * @return period The period string to use (e.g. 14d)
 */
function getPeriodForTimeWindow(timeWindow: TimeWindow): string {
  return TIME_WINDOW_TO_PERIOD[timeWindow];
}

const TransparentLoadingMask = styled(LoadingMask)<{visible: boolean}>`
  ${p => !p.visible && 'display: none;'};
  opacity: 0.4;
  z-index: 1;
`;

const PanelNoMargin = styled(Panel)`
  margin: 0;
`;

/**
 * We wrap Panel with this (instead of applying styles to Panel) so that we can get the extra padding
 * at the bottom so sticky chart does not bleed into other content.
 */
const StickyWrapper = styled('div')`
  position: sticky;
  top: 69px; /* Height of settings breadcrumb */
  z-index: ${p => p.theme.zIndex.dropdown + 1};
  padding-bottom: ${space(2)};
  background-color: rgba(251, 251, 252, 0.9); /* p.theme.whiteDark */
`;
