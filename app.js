/* globals _ angular */

'use strict';

(function(angular) {
  angular.module('app', ['ngMaterial'])
    .controller('pageCtrl', pageCtrl)
    .service('locationsService', locationsService);

  function pageCtrl($scope, locationsService) {
    $scope.sortList = [{
      label: 'Cheapest',
      key: 'price'
    }, {
      label: 'Fastest',
      key: 'time'
    }];

    locationsService
      .then(res => {
        $scope.locations = res.locations;
      });

    $scope.onSwap = function() {
      var tmp = $scope.q.from;
      $scope.q.from = $scope.q.to;
      $scope.q.to = tmp;
    };

    $scope.search = function() {
      locationsService
        .then(l => {
          $scope.routes = l.findRoute($scope.q.from, $scope.q.to, $scope.q.sort);
          $scope.total = _.sumBy($scope.routes, r => r.cost - r.cost * (r.discount/100));
        });
    };

    $scope.reset = function() {
      $scope.q = {
        sort: $scope.sortList[0].key
      };
      $scope.routes = null;
    };

    $scope.reset();
  }

  function locationsService($http) {
    let data;

    this.get = function() {
      return $http.get('response.json')
        .then(res => data = res.data)
        .then(() => {
          return {
            findRoute,
            locations: _.uniq(data.deals.map(d => d.arrival))
          };
        });

      function findRoute(from, to, searchBy) {
        const unvisited = _.uniq(data.deals.map(d => d.arrival));
        const visited = unvisited.splice(unvisited.indexOf(from), 1);
        const edg = {};
        let dst = {};
        const prev = {};
        unvisited.forEach(u => dst[u] = Infinity);
        dst[visited[0]] = 0;
        let current = from;

        let i = 0;
        while(current !== to && i < 10) {
          current = checkNeighbours();
          i++;
          visited.push(unvisited.splice(unvisited.indexOf(current), 1)[0]);
        }

        let res = [];
        let r = to;

        while(prev[r]) {
          res.push(edg[r]);
          r = prev[r];
        }

        return res;

        function checkNeighbours() {
          let edges = data.deals.filter(d => d.departure === current);

          unvisited.forEach(un => {
            let edgesToThis = edges.filter(e => e.arrival === un);
            _.each(edgesToThis, e => {
              e.time = Number(e.duration.h) * 60 + Number(e.duration.m);
              e.price = e.cost - e.cost * (e.discount / 100);
            });

            let e = _.sortBy(edgesToThis, searchBy)[0];
            if (e) {
              let d = e[searchBy];
              d += dst[current];
              if (dst[un] < d) {
                dst[un] = dst[un];
              } else {
                dst[un] = d;
                prev[un] = current;
                edg[un] = e;
              }
            }
          });

          let min = _.minBy(_.map(unvisited, x => ({name: x, val: dst[x]})), 'val');
          return min.name;
        }
      }
    };

    return this.get();
  }

})(angular);
