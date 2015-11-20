// main.js
var loc = '../';
require.config({
    baseUrl: 'js',
    paths: {
        jquery: loc + 'bower_components/jquery/dist/jquery',
        q: loc + 'bower_components/q/q',
        underscore: loc + 'bower_components/underscore/underscore',
        bootstrap: loc + 'bower_components/bootstrap/dist/js/bootstrap.min',
        react: loc + 'bower_components/react/react-with-addons',
        jschannel: loc + 'bower_components/jschannel/src/jschannel',
        imjs:  loc + 'bower_components/imjs/js/im'
    },
    shim: {
        backbone: {
            deps: [
                'underscore',
                'jquery'
            ],
            exports: 'Backbone'
        },
        bootstrap: {
          deps: ['jquery'],
          exports: '$'
        },
        jschannel: {
          exports: 'Channel'
        },
        underscore: {
            deps: [
            ],
            exports: '_'
        },
        react: {
            exports: 'React',
        }
    }
});

require([
    'react',
    'imjs',
    'jschannel',
    './analysis-tools',
    './object/report',
    'bootstrap'], function (React, imjs, Channel, ListView, ObjectView) {

    'use strict';

    var chan = Channel.build({
      window: window.parent,
      origin: '*',
      scope: 'CurrentStep'
    });

    var activeTabs = null;

    chan.bind('configure', function (trans, params) {
      activeTabs = params.activeTabs;
      return 'ok';
    });

    chan.bind('init', function (trans, params) {
      var loadView, rootNode = document.body;
      if (params.listName) {
        loadView = initList(params);
      } else if (params.item) {
        loadView = initItem(params);
      } else {
        console.error("Unknown message", params);
        trans.error('Could not interpret message');
      }
      loadView.then(function (view) {
        React.renderComponent(view, rootNode);
        trans.complete('ok');
      }, function (error) {
        console.error('Failed to initialise view', error);
        trans.error('not ok');
      });
      trans.delayReturn(true);
    });

    chan.bind('style', function (trans, params) {

      var head = document.getElementsByTagName("head")[0];
      var link = document.createElement('link');

      link.rel = "stylesheet";
      link.href = params.stylesheet;

      head.appendChild(link);

    });

    function initList (params) {
      var listName = params.listName;
      var serviceArgs = params.service;
      serviceArgs.errorHandler = function(error){
        console.error('Communication error!\n', error);
      }
      var service = imjs.Service.connect(serviceArgs);

      return service.fetchList(listName).then(function showList (list) {

        var listView = new ListView({
          service: service,
          activeTabs: activeTabs,
          list: list,
          onSelectedItems: reportItems.bind(null, service),
          executeQuery: executeQuery.bind(null, serviceArgs.root),
          wants: wants
        });

        chan.notify({
          method: 'has-list',
          params: {
            root: service.root,
            name: list.name,
            type: list.type
          }
        });
        list.contents().then(function (objs) {
          var ids = objs.map(function (o) { return o.objectId; });
          reportItems(service, list.type, list.type, ids, ['available']);
        });
        return listView;
      });
    }

    function initItem (params) {

      var type = params.item.type; // eg: "Gene"
      var fields = params.item.fields; // eg: {'organism.taxonId': 7227, primaryIdentifier: 'FBGN000123'}
      var serviceArgs = params.service;
      var service = imjs.Service.connect(serviceArgs);

      var query = {
        from: type,
        select: ['id'],
        where: fields
      };

      return service.records(query).then(function (objects) {
        var object = objects[0];
        var path = type; // here the path is the same as the type.
        var view = ObjectView.create({
          service: service,
          object: {id: object.objectId, type: object['class']}
        });
        reportItems(service, path, type, [object.objectId], ['available']);
        return view;
      });
    }

    function wants (message) {
      chan.notify({
        method: 'wants',
        params: message
      });
    }

    function executeQuery (root, title, query) {
      nextStep({
        title: 'ran ' + title,
        tool: 'show-table',
        data: {
          query: query,
          service: { root: root }
        }
      });
    }

    function nextStep (data) {
      chan.notify({
        method: 'next-step',
        params: data
      });
    }

    function reportItems (service, path, type, ids, categories) {
      if (!categories) {
        categories = ['selected'];
      }
      chan.notify({
        method: 'has',
        params: {
          what: 'ids',
          data: {
            key: (categories.join(',') + '-' + path), // String - any identifier.
            type: type, // String - eg: "Protein"
            categories: categories, // Array[string] - eg: ['selected']
            ids: ids,  // Array[Int] - eg: [123, 456, 789]
            service: {root: service.root}
          }
        }
      });
    }
});
