import React from 'react';
import styled from '@emotion/styled';
import PropTypes from 'prop-types';
import * as ReactRouter from 'react-router';

import {t} from 'app/locale';
import SearchBar from 'app/components/searchBar';
import SentryTypes from 'app/sentryTypes';
import {Panel} from 'app/components/panels';
import space from 'app/styles/space';
import EventView from 'app/utils/discover/eventView';
import EventsV2 from 'app/utils/discover/eventsv2';
import {stringifyQueryObject, QueryResults} from 'app/utils/tokenizeSearch';
import AlertLink from 'app/components/alertLink';
import {IconWarning} from 'app/icons';

import {SentryTransactionEvent, ParsedTraceType} from './types';
import {parseTrace, getTraceDateTimeRange} from './utils';
import TraceView from './traceView';

type Props = {
  orgId: string;
  event: SentryTransactionEvent;
  eventView: EventView;
} & ReactRouter.WithRouterProps;

type State = {
  parsedTrace: ParsedTraceType;
  searchQuery: string | undefined;
};

class SpansInterface extends React.Component<Props, State> {
  static propTypes = {
    event: SentryTypes.Event.isRequired,
    orgId: PropTypes.string.isRequired,
  };

  state: State = {
    searchQuery: undefined,
    parsedTrace: parseTrace(this.props.event),
  };

  static getDerivedStateFromProps(props: Props, state: State): State {
    return {
      ...state,
      parsedTrace: parseTrace(props.event),
    };
  }

  handleSpanFilter = (searchQuery: string) => {
    this.setState({
      searchQuery: searchQuery || undefined,
    });
  };

  renderTraceErrorsAlert({
    isLoading,
    numOfErrors,
    traceErrorsEventView,
  }: {
    isLoading: boolean;
    numOfErrors: number;
    traceErrorsEventView: EventView;
  }) {
    if (isLoading) {
      return null;
    }

    if (numOfErrors === 0) {
      return null;
    }

    const {orgId} = this.props;

    const label =
      numOfErrors > 1
        ? t(`There were %d errors associated with this event.`, numOfErrors)
        : t(`There was an error associated with this event.`);

    return (
      <AlertLink
        to={traceErrorsEventView.getResultsViewUrlTarget(orgId)}
        icon={<IconWarning />}
        priority="error"
      >
        {label}
      </AlertLink>
    );
  }

  render() {
    const {event, orgId, eventView, location} = this.props;
    const {parsedTrace} = this.state;

    // construct discover query to fetch error events associated with this transaction

    const {start, end} = getTraceDateTimeRange({
      start: parsedTrace.traceStartTimestamp,
      end: parsedTrace.traceEndTimestamp,
    });

    const conditions: QueryResults = {
      query: [],
      'event.type': ['error'],
      trace: [parsedTrace.traceID],
    };

    if (typeof event.title === 'string') {
      conditions.transaction = [event.title];
    }

    const traceErrorsEventView = EventView.fromSavedQuery({
      id: undefined,
      name: `Errors related to transaction ${parsedTrace.rootSpanID}`,
      fields: [
        'title',
        'project',
        'timestamp',
        'trace',
        'trace.span',
        'trace.parent_span',
      ],
      orderby: '-timestamp',
      query: stringifyQueryObject(conditions),
      projects: [],
      version: 2,
      start,
      end,
    });

    return (
      <div>
        <EventsV2 location={location} eventView={traceErrorsEventView} orgSlug={orgId}>
          {({isLoading, tableData}) => {
            const numOfErrors = tableData?.data.length || 0;

            return (
              <React.Fragment>
                {this.renderTraceErrorsAlert({
                  isLoading,
                  numOfErrors,
                  traceErrorsEventView,
                })}
                <StyledSearchBar
                  defaultQuery=""
                  query={this.state.searchQuery || ''}
                  placeholder={t('Search for spans')}
                  onSearch={this.handleSpanFilter}
                />
                <Panel>
                  <TraceView
                    event={event}
                    searchQuery={this.state.searchQuery}
                    orgId={orgId}
                    eventView={eventView}
                    parsedTrace={parsedTrace}
                  />
                </Panel>
              </React.Fragment>
            );
          }}
        </EventsV2>
      </div>
    );
  }
}

const StyledSearchBar = styled(SearchBar)`
  margin-bottom: ${space(1)};
`;

export default ReactRouter.withRouter(SpansInterface);
