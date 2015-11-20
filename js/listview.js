define(function (require, exports, module) {

  'use strict';

  var React = require('react')
    , localStorage = require('./local-storage')
    , mixins = require('./mixins')
    , Contents = require('./listcontents')
    , ContentTable = require('./content-table')
    , DetailsView = require('./details-view')
    , BreadCrumbs = require('./breadcrumbs');

  var viewKey = 'org.intermine.list-tool.list.view';
  var valuesCache = {};

  var ListView = React.createClass({

    displayName: 'ListView',

    getInitialState: function () {
      return {
        path: this.props.list.type,
        view: (localStorage[viewKey] || 'table'), 
        selected: {},
        classkeys: {}
      }
    },

    mixins: [mixins.SetStateProperty, mixins.ComputableState],

    computeState: function (props) {
      if (!this.state.path) {
        this.setStateProperty('path', props.list.type);
      }
      props.service.fetchClassKeys()
           .then(this.setStateProperty.bind(this, 'classkeys'), console.error.bind(console));
    },

    render: function () {
      var controls, contents, contentArgs;
      try {

        controls = BreadCrumbs({
          path: this.state.path,
          service: this.props.service,
          proceedTo: this._proceedTo,
          revertTo: this._revertTo,
          view: this.state.view,
          onChangeView: this._changeView
        });

        contentArgs = {
          service: this.props.service,
          list: this.props.list,
          classkeys: this.state.classkeys,
          path: this.state.path,
          selected: (this.state.selected[this.state.path] || {}),
          onItemSelected: this._onItemSelected,
          filterTerm: this.props.filterTerm
        };

        if (this.state.view === 'grid') {
          contents = Contents(contentArgs);
        } else if (this.state.view === 'table') {
          contents = ContentTable(contentArgs);
        } else if (this.state.view === 'details') {
          contents = DetailsView(contentArgs);
        } else {
          contents = React.DOM.p({className: 'error'}, 'Unknown view: ' + this.state.view);
        }

        return React.DOM.div({}, controls, contents);
      } catch (e) {
        console.error(e);
      }
    },

    _onItemSelected: function (id, isSelected) {
      var state = this.state;
      var selected = state.selected;
      var pathSelections = (selected[state.path] || (selected[state.path] = {}));
      pathSelections[id] = isSelected;
      this.setState(state);
      this.reportSelection();
    },

    _changeView: function (view) {
      localStorage[viewKey] = view;
      this.setStateProperty('view', view);
    },

    _revertTo: function revertTo (path) {
      this.setStateProperty('path', path);
    },

    _proceedTo: function proceedTo (ref) {
      var state = this.state;
      this.setStateProperty('path', state.path + '.' + ref.name);
    },

    reportSelection: function () {
      var path
        , state = this.state
        , selected = this.state.selected
        , props = this.props
        , list = props.list;

      console.log(selected);
      for (path in selected) {
        var selections = selected[path];

        if (path === list.type) {
          if (selections.all) {
            props.onSelectedList(list);
          } else {
            props.onSelectedItems(path, path, selectedIds(selections));
          }
        } else {
          reportPathSelection(props.service, list, path, selections, props.onSelectedItems);
        }
      }
    }
  });

  return ListView;

  function reportPathSelection (service, list, path, selected, fn) {
    service.fetchModel().then(function (model) {
      var type = model.makePath(path).getType().name;

      if (selected.all) {
        queryValues(service, {
          select: [path + ".id"],
          where: [{
            path: list.type,
            op: 'IN',
            value: list.name
          }]
        }).then(function (ids) {
          fn(path, type, ids);
        });
      } else {
        fn(path, type, selectedIds(selected));
      }
    });
  }

  function queryValues (service, query) {
    var key = service.root + JSON.stringify(query);
    var cached = valuesCache[key];
    if (cached) {
      return cached;
    } else {
      return valuesCache[key] = service.values(query);
    }
  }

  function selectedIds (selected) {
    var keys = Object.keys(selected);
    return keys.filter(function (k) { return selected[k]; });
  }

});
