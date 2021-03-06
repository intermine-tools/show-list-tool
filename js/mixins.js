define(['underscore', 'imjs'], function (_, imjs) {

  'use strict';

  var IS_BLANK = /^\s+$/;

  var ComputableState = {
    componentWillMount: onPropChange,
    componentWillReceiveProps: onPropChange
  };

  var SetStateProperty = {setStateProperty: setStateProperty};

  var Filtered = {matchesFilter: matchesFilter};

  var BuildsQuery = {
    itemMatchesFilter: itemMatchesFilter,
    rowMatchesFilter: rowMatchesFilter,
    buildQuery: buildQuery
  };

  return {
    SetStateProperty: SetStateProperty,
    Filtered: Filtered,
    BuildsQuery: BuildsQuery,
    ComputableState: ComputableState
  };

  // Requires:
  //   * props.filterTerm
  function matchesFilter (thing) {
    var ft = this.props.filterTerm;
    if (ft == null) return true;
    return _.any([thing.name, thing.description], function (text) {
      return text ? text.toLowerCase().indexOf(ft) >= 0 : false;
    });
  }

  function setStateProperty (prop, val) {
      var state = {};
      state[prop] = val;
      this.setState(state);
  }

  function onPropChange (props) {
    props = (props || this.props);
    this.computeState(props);
  }

  // Requires:
  //   * props.service: an imjs.Service object.
  //   * props.list: an imjs.List record
  //   * props.path: a path string descending from props.list.type to a reference
  // Optional:
  //   * props.filterTerm: term to filter results by.
  // Sets: state.query, allItems, 
  function buildQuery (executor, props, model, summaryFields) {
    var that = this
      , path = props.path
      , list = props.list
      , fields = summaryFields[model.makePath(path).getType().name]
      , constraint = {path: list.type, op: 'IN', value: list.name}
      , columns = [path + '.id'].concat(_.map(fields, addField))
      , query = {select: columns, where: [constraint], joins: {}};

    // Make all references below path optional, using outer-joins.
    fields.forEach(function (fld) {
      var i, l, fldParts = fld.split('.');
      for (i = 1, l = fldParts.length; i + 1 < l; i++) {
        var joinPath = props.path + '.' + fldParts.slice(1, i + 1).join('.');
        query.joins[joinPath] = 'OUTER';
      }
    });

    if (JSON.stringify(query) !== JSON.stringify(this.state.query)) {
      var q = new imjs.Query(query, props.service);
      q.model = model;
      executor.submit(q).then(setItems);
    }
    
    function setItems (items) {
      var state = {
        allItems: items,
        items: items.filter(rowMatchesFilter(props.filterTerm)),
        query: query
      };

      that.setState(state);
    }

    function addField (field) {
      return path + field.replace(/^[^.]+/, '');
    }
  }

  function itemMatchesFilter (filterTerm) {
    if (filterTerm == null || IS_BLANK.test(filterTerm)) {
      return alwaysTrue;
    } else {
      filterTerm = filterTerm.toLowerCase();
      return function (item) {
        var i, l, key, value, fields = _.keys(item);
        for (i = 0, l = fields.length; i < l; i++) {
          key = fields[i];
          if (item[key]) {
            value = String(item[key]).toLowerCase();
            if (value.indexOf(filterTerm) >= 0) {
              return true;
            }
          }
        }
        return false;
      };
    }
  }

  function rowMatchesFilter (filterTerm) {
    if (filterTerm == null || IS_BLANK.test(filterTerm)) {
      return alwaysTrue;
    } else {
      filterTerm = filterTerm.toLowerCase();
      return function (item) {
        var i, l, value;
        for (i = 1, l = item.length; i < l; i++) {
          if (item[i]) {
            value = String(item[i]).toLowerCase();
            if (value.indexOf(filterTerm) >= 0) {
              return true;
            }
          }
        }
        return false;
      };
    }
  }

  function alwaysTrue () {
    return true;
  }

});
