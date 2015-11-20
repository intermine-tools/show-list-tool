define(['react', 'q', 'underscore', './mixins', './dropdown', './filter-box'],
    function (React, Q, _, mixins, Dropdown, FilterBox) {
  'use strict';

  var d  = React.DOM
    , li = React.DOM.li
    , ol = React.DOM.ol
    , a  = React.DOM.a;

  var BreadCrumbs = React.createClass({

    displayName: 'BreadCrumbs',

    mixins: [mixins.SetStateProperty, mixins.ComputableState],

    getInitialState: function () {
      return {
        references: [], // Array of pairs: [Ref, Name]
        segments: []
      };
    },

    renderViewChooser: function (key, label, icon) {
        return d.button(
          {
            type: 'button',
            className: 'btn btn-default' + (this.props.view === key ? ' active' : ''),
            onClick: this.props.onChangeView.bind(null, key)
          },
          d.i({className: 'fa fa-' + icon}),
          d.span({className: '.visible-lg'}, ' ', label));
    },

    render: function () {

      var viewChoosers = d.div(
        {className: 'pull-right btn-group'},

        this.renderViewChooser('grid', 'Grid', 'th-large'),
        this.renderViewChooser('table', 'Table', 'th-list')
      // put this back when we have a details view that looks good
      //  this.renderViewChooser('details', 'Details', 'bars')
        );

      var segments = this.state.segments.map(function (seg, i, a) {
        var isLast = i + 1 == a.length;
        if (isLast) {
          return li({key: seg, className: 'active'}, seg.segment);
        } else {
          return li(
            {key: seg.path},
            React.DOM.a(
              {onClick: this.props.revertTo.bind(null, seg.path)},
              seg.segment));
        }
      }.bind(this));

      if (this.state.references.length) {
        var dropdown = li({}, Dropdown({
          mainTitle: "Proceed to",
          links: this.state.references.map(function (ref, i) {
            return a({onClick: this.props.proceedTo.bind(null, ref[0])}, ref[1]);
          }.bind(this))
        }));
        return ol({className: 'breadcrumb'}, viewChoosers, segments, dropdown);
      } else {
        return ol({className: 'breadcrumb'}, viewChoosers, segments);
      }

    },

    computeState: function (nextProps) {
      this._determineSegments(nextProps);
      this._determineReferences(nextProps);
    },

    _determineReferences: function(props) {
      var that = this;

      props.service.fetchModel().then(function (model) {
        var path = model.makePath(props.path);
        var fields = path.getType().fields;
        var references = _.values(fields).filter(isReference);
        references.sort(function (a, b) {
          if (a.name > b.name) {
            return 1;
          } else if (a.name < b.name) {
            return -1;
          }
          return 0;
        });
        var namings = references.map(function (ref) {
          return path.append(ref.name).getDisplayName();
        });
        Q.all(namings).then(function (names) {
          names = names.map(function (name) {
            return name.replace(/.* > /, '');
          });
          that.setStateProperty('references', _.zip(references, names));
        });
      });
    },

    _determineSegments: function (props) {
      var i, l, part, path
        , that = this
        , service = props.service
        , parts = props.path.split('.')
        , segments = Array(parts.length)
        , base = parts[0]
        , paths = [base];

      for (i = 1, l = parts.length; i < l; i++) {
        part = parts[i];
        path = base + '.' + part;
        paths.push(path);
        base = path;
      }

      paths.forEach(function (path, i) {
        service.fetchModel().then(function(model) {
          var pathInfo = model.makePath(path);
          pathInfo.getDisplayName().then(function (name) {
            var state = that.state;
            var end = name.split(' > ').pop();
            segments[i] = {segment: end, path: path};
            state.segments = segments.slice().filter(bool);
            that.setState(state);
          });
        });
      });
    }
  });

  return BreadCrumbs;

  function bool (x) {
    return !!x;
  }

  function isReference (fld) {
    return !!fld.referencedType;
  }

});
