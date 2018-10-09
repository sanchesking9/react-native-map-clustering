import React, { Component } from 'react';
import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

export default class CustomMarker extends Component {
  shouldComponentUpdate(nextProps) {
    return !(this.props.geometry === nextProps.geometry
      && this.props.pointCount === nextProps.pointCount);
  }

  render() {
    if (this.props.pointCount > 0) {
      const font = {};
      if (this.props.pointCount > 1000) {
        font.fontSize = 16;
      } else if (this.props.pointCount > 10000) {
        font.fontSize = 14;
      } else if (this.props.pointCount > 100000) {
        font.fontSize = 12;
      }
      return (
        <Marker
          coordinate={{
            longitude: this.props.geometry.coordinates[0],
            latitude: this.props.geometry.coordinates[1],
          }}
          onPress={this.props.pointCount > 0 && this.props.onClusterPress}
        >
          <View style={this.props.clusterStyle}>
            <Text style={[this.props.clusterTextStyle, font]}>
              {this.props.pointCount}
            </Text>
          </View>
        </Marker>
      );
    }
    return this.props.marker;
  }
}
