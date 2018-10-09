import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import MapView from 'react-native-maps';
import { width as w, height as h } from 'react-native-dimension';
import SuperCluster from 'supercluster';
import CustomMarker from './CustomMarker';

export default class MapWithClustering extends PureComponent {
  state = {
    currentRegion: this.props.region,
    clusterStyle: {
      borderRadius: w(15),
      backgroundColor: this.props.clusterColor,
      borderColor: this.props.clusterBorderColor,
      borderWidth: this.props.clusterBorderWidth,
      width: w(15),
      height: w(15),
      justifyContent: 'center',
      alignItems: 'center',
    },
    clusterTextStyle: {
      fontSize: this.props.clusterTextSize,
      color: this.props.clusterTextColor,
      fontWeight: 'bold',
    },
  };
  currentRegion = this.props.region;

  componentDidMount() {
    this.createMarkersOnMap(this.props.children);
  }

  componentWillReceiveProps(next) {
    this.createMarkersOnMap(next.children);
  }

  onRegionChangeComplete = (region) => {
    this.currentRegion = region;
    const { latitude, latitudeDelta, longitude, longitudeDelta } = this.state.currentRegion;
    if (region.longitudeDelta <= 80) {
      if ((Math.abs(region.latitudeDelta - latitudeDelta) > latitudeDelta / 8)
        || (Math.abs(region.longitude - longitude) >= longitudeDelta / 5)
        || (Math.abs(region.latitude - latitude) >= latitudeDelta / 5)) {
        this.calculateClustersForMap(region);
      }
    }
    this.props.onRegionChangeComplete(region);
  };

  createMarkersOnMap = (children) => {
    const markers = [];
    const otherChildren = [];

    React.Children.forEach(children, (marker) => {
      if (marker && marker.props && !marker.props.notCluster && marker.props.coordinate) {
        markers.push({
          marker,
          properties: { point_count: 0 },
          geometry: {
            type: 'Point',
            coordinates: [
              marker.props.coordinate.longitude,
              marker.props.coordinate.latitude,
            ],
          },
        });
      } else {
        otherChildren.push(marker);
      }
    });

    if (!this.superCluster) {
      this.superCluster = SuperCluster({
        radius: this.props.radius,
        maxZoom: 20,
        minZoom: 1,
      });
    }

    this.superCluster.load(markers);

    this.setState({
      markers,
      otherChildren,
    }, () => {
      this.calculateClustersForMap();
    });
  };

  calculateBBox = region => [
    region.longitude - region.longitudeDelta, // westLng - min lng
    region.latitude - region.latitudeDelta, // southLat - min lat
    region.longitude + region.longitudeDelta , // eastLng - max lng
    region.latitude + region.latitudeDelta// northLat - max lat
  ];

  getBoundsZoomLevel = (bounds, mapDim) => {
    const WORLD_DIM = { height: mapDim.height, width: mapDim.width };
    const ZOOM_MAX = 20;

    function latRad(lat) {
      const sin = Math.sin(lat * Math.PI / 180);
      const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
      return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }

    function zoom(mapPx, worldPx, fraction) {
      return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }

    const latFraction = (latRad(bounds[3]) - latRad(bounds[1])) / Math.PI;
    const lngDiff = bounds[2] - bounds[0];
    const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;
    const latZoom = zoom(mapDim.height, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(mapDim.width, WORLD_DIM.width, lngFraction);

    return Math.min(latZoom, lngZoom, ZOOM_MAX);
  };

  // calculateClustersForMap = async (currentRegion = this.currentRegion) => {
  //   let clusteredMarkers = [];
  //   let markers = {};
  //   this.props.onClusteringStart();
  //
  //   for (let i = 0; i < this.state.markers.length; i++) {
  //     let thisMarker = this.state.markers[i];
  //     if (!markers[thisMarker.marker.props.country]) {
  //       markers[thisMarker.marker.props.country] = [thisMarker];
  //       continue;
  //     }
  //     markers[thisMarker.marker.props.country].push(thisMarker);
  //   }
  //
  //   for (let key in markers) {
  //     let list = markers[key];
  //     this.superCluster.load(list);
  //
  //     if (this.props.clustering && this.superCluster) {
  //       const bBox = this.calculateBBox(currentRegion);
  //       let zoom = this.getBoundsZoomLevel(bBox, { height: h(100), width: w(100) });
  //       const clusters = await this.superCluster.getClusters([bBox[0], bBox[1], bBox[2], bBox[3]], zoom);
  //
  //       clusteredMarkers = clusteredMarkers.concat(clusters.map(cluster => (<CustomMarker
  //         pointCount={cluster.properties.point_count}
  //         clusterId={cluster.properties.cluster_id}
  //         geometry={cluster.geometry}
  //         clusterStyle={this.state.clusterStyle}
  //         clusterTextStyle={this.state.clusterTextStyle}
  //         marker={cluster.properties.point_count === 0 ? cluster.marker : null}
  //         key={JSON.stringify(cluster.geometry) + cluster.properties.cluster_id + cluster.properties.point_count}
  //         onClusterPress={this.props.onClusterPress}
  //       />)));
  //     } else {
  //       clusteredMarkers = clusteredMarkers.concat(list.map(marker => marker.marker));
  //     }
  //   }
  //
  //   this.setState({
  //     clusteredMarkers,
  //     currentRegion,
  //   }, () => {
  //     this.props.onClusteringEnd();
  //   });
  // };

  calculateClustersForMap = (currentRegion = this.state.currentRegion) => {
    let clusteredMarkers = [];


    if (this.props.clustering && this.superCluster) {
      const bBox = this.calculateBBox(this.state.currentRegion);
      let zoom = this.getBoundsZoomLevel(bBox, { height: h(100), width: w(100) });
      const clusters = this.superCluster.getClusters([bBox[0], bBox[1], bBox[2], bBox[3]], zoom);

      let cluster;
      for (let i = 0, len = clusters.length; i < len; i++) {
        cluster = clusters[i];
        clusteredMarkers.push(<CustomMarker
          pointCount={cluster.properties.point_count}
          clusterId={cluster.properties.cluster_id}
          geometry={cluster.geometry}
          clusterStyle={this.state.clusterStyle}
          clusterTextStyle={this.state.clusterTextStyle}
          marker={cluster.properties.point_count === 0 ? cluster.marker : null}
          key={JSON.stringify(cluster.geometry) + cluster.properties.cluster_id + cluster.properties.point_count}
          onClusterPress={this.props.onClusterPress}
        />)
      }
    } else {
      clusteredMarkers = this.state.markers.map(marker => marker.marker);
    }


    this.setState({
      clusteredMarkers,
      currentRegion,
    });
  };

  removeChildrenFromProps = (props) => {
    const newProps = {};
    Object.keys(props).forEach((key) => {
      if (key !== 'children' && key !== 'region') {
        newProps[key] = props[key];
      }
    });
    return newProps;
  };

  render() {
    return (
      <MapView
        {...this.removeChildrenFromProps(this.props)}
        ref={(ref) => { this.root = ref; }}
        initialRegion={this.state.currentRegion}
        onRegionChangeComplete={this.onRegionChangeComplete}
      >
        {this.state.clusteredMarkers}
        {this.state.otherChildren}
      </MapView>
    );
  }
}

MapWithClustering.propTypes = {
  region: PropTypes.object,
  clustering: PropTypes.bool,
  radius: PropTypes.number,
  clusterColor: PropTypes.string,
  clusterTextColor: PropTypes.string,
  clusterBorderColor: PropTypes.string,
  clusterBorderWidth: PropTypes.number,
  clusterTextSize: PropTypes.number,
  onClusterPress: PropTypes.func,
  onRegionChangeComplete: PropTypes.func,
  onClusteringStart: PropTypes.func,
  onClusteringEnd: PropTypes.func
};

const totalSize = num => (Math.sqrt((h(100) * h(100)) + (w(100) * w(100))) * num) / 100;

MapWithClustering.defaultProps = {
  clustering: true,
  radius: w(5),
  clusterColor: '#F5F5F5',
  clusterTextColor: '#FF5252',
  clusterBorderColor: '#FF5252',
  clusterBorderWidth: 1,
  clusterTextSize: totalSize(2.4),
  onClusterPress: () => {},
  onRegionChangeComplete: () => {},
  onClusteringStart: () => {},
  onClusteringEnd: () => {}
};
