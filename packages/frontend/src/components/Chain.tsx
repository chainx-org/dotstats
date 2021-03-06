import * as React from 'react';
import { State as AppState } from '../state';
import { formatNumber, secondsWithPrecision, viewport } from '../utils';
import { Tile, Icon, Node, Ago } from './';
import { Types } from '@dotstats/common';

import blockIcon from '../icons/package.svg';
import blockTimeIcon from '../icons/history.svg';
import lastTimeIcon from '../icons/watch.svg';
import worldIcon from '../icons/globe.svg';

const MAP_RATIO = 800 / 350;
const MAP_HEIGHT_ADJUST = 400 / 350;
const HEADER = 148;

import './Chain.css';

export namespace Chain {
  export interface Props {
    appState: Readonly<AppState>;
  }

  export interface State {
    display: 'map' | 'table';
    map: {
      width: number;
      height: number;
      top: number;
      left: number;
    }
  }
}

function sortNodes(a: AppState.Node, b: AppState.Node): number {
  if (a.blockDetails[0] === b.blockDetails[0]) {
    const aPropagation = a.blockDetails[4] == null ? Infinity : a.blockDetails[4] as number;
    const bPropagation = b.blockDetails[4] == null ? Infinity : b.blockDetails[4] as number;

    // Ascending sort by propagation time
    return aPropagation - bPropagation;
  }

  // Descending sort by block number
  return b.blockDetails[0] - a.blockDetails[0];
}

export class Chain extends React.Component<Chain.Props, Chain.State> {
  constructor(props: Chain.Props) {
    super(props);

    this.state = {
      display: window.location.hash === '#map' ? 'map' : 'table',
      map: {
        width: 0,
        height: 0,
        top: 0,
        left: 0
      }
    };
  }

  public componentWillMount() {
    this.calculateMapDimensions();

    window.addEventListener('resize', this.calculateMapDimensions);
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.calculateMapDimensions);
  }

  public render() {
    const { best, blockTimestamp, blockAverage } = this.props.appState;
    const { display } = this.state;

    const toggleClass = ['Chain-map-toggle'];

    if (display === 'map') {
      toggleClass.push('Chain-map-toggle-on');
    }

    return (
      <div className="Chain">
        <div className="Chain-header">
          <Tile icon={blockIcon} title="Best Block">#{formatNumber(best)}</Tile>
          <Tile icon={blockTimeIcon} title="Average Time">{ blockAverage == null ? '-' : secondsWithPrecision(blockAverage / 1000) }</Tile>
          <Tile icon={lastTimeIcon} title="Last Block"><Ago when={blockTimestamp} /></Tile>
          <div className={toggleClass.join(' ')}>
            <Icon src={worldIcon} alt="Toggle Map" onClick={this.toggleMap} />
          </div>
        </div>
        <div className="Chain-content-container">
          <div className="Chain-content">
          {
            display === 'table'
              ? this.renderTable()
              : this.renderMap()
          }
          </div>
        </div>
      </div>
    );
  }

  private toggleMap = () => {
    if (this.state.display === 'map') {
      this.setState({ display: 'table' });
      window.location.hash = '';
    } else {
      this.setState({ display: 'map' });
      window.location.hash = '#map';
    }
  }

  private renderMap() {
    return (
      <div className="Chain-map">
      {
        this.nodes().map((node) => {
          const location = node.location;

          if (!location || location[0] == null || location[1] == null) {
            // Skip nodes with unknown location
            return null;
          }

          const { left, top, quarter } = this.pixelPosition(location[0], location[1]);

          return (
            <Node.Location key={node.id} left={left} top={top} quarter={quarter} {...node} />
          );
        })
      }
      </div>
    );
  }

  private renderTable() {
    return (
      <table className="Chain-node-list">
        <Node.Row.Header />
        <tbody>
        {
          this.nodes().sort(sortNodes).map((node) => <Node.Row key={node.id} {...node} />)
        }
        </tbody>
      </table>
    );
  }

  private nodes() {
    return Array.from(this.props.appState.nodes.values());
  }

  private pixelPosition(lat: Types.Latitude, lon: Types.Longitude): Node.Location.Position {
    const { map } = this.state;

    // Longitude ranges -180 (west) to +180 (east)
    // Latitude ranges +90 (north) to -90 (south)
    const left = Math.round(((180 + lon) / 360) * map.width + map.left);
    const top = Math.round(((90 - lat) / 180) * map.height + map.top) * MAP_HEIGHT_ADJUST;

    let quarter = 0;

    if (lon > 0) {
      quarter |= 1;
    }

    if (lat < 0) {
      quarter |= 2;
    }

    return { left, top, quarter: quarter as 0 | 1 | 2 | 3 };
  }

  private calculateMapDimensions: () => void = () => {
    const vp = viewport();

    vp.width = Math.max(1350, vp.width);
    vp.height -= HEADER;

    const ratio = vp.width / vp.height;

    let top = 0;
    let left = 0;
    let width = 0;
    let height = 0;

    if (ratio >= MAP_RATIO) {
      width = Math.round(vp.height * MAP_RATIO);
      height = Math.round(vp.height);
      left = (vp.width - width) / 2;
    } else {
      width = Math.round(vp.width);
      height = Math.round(vp.width / MAP_RATIO);
      top = (vp.height - height) / 2;
    }

    this.setState({ map: { top, left, width, height }});
  }
}
