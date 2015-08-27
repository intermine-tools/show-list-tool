var chan = Channel.build({
  window: window.document.getElementById('child').contentWindow,
  origin: '*',
  scope: 'CurrentStep'
});

var itemsMsgs = {};

function errorHandler(whatFailed, e){
  console.log(whatFailed + " failed because: " + e);
}

chan.call({
  method: 'configure',
  params: {
    activeTabs: ['enrich']
  },
  success: function () {
    console.log("Tool configured");
  },
  error: function (e) {
    errorHandler('configuration',e);
  }
});

function loadList () {
  var listName = 'PL FlyAtlas_head_top';
  document.querySelector('.panel-heading').innerHTML = listName;
  function error(e){ errorHandler('initialisation', e); }

  chan.call({
    method: 'init',
    params: {
      listName: listName,
      service: {
        root: "http://www.flymine.org/query",
        errorHandler : error
      }
    },
    success: function () {
      console.log("Tool initialised");
    },
    error: error
  });
}

function loadItem () {
  function error(e){ errorHandler('initialisation', e); }

  var primaryId = 'FBgn0000606';
  document.querySelector('.panel-heading').innerHTML = primaryId;
  chan.call({
    method: 'init',
    params: {
      item: {
        type: 'Gene',
        fields: {
          'organism.taxonId': 7227,
          'primaryIdentifier': primaryId
        }
      },
      service: {
        root: "http://www.flymine.org/query",
        errorHandler : error
      }
    },
    success: function () {
      console.log("Tool initialised");
    },
    error: error
  });

}

var head = document.getElementsByTagName("head")[0];
var links = document.getElementsByTagName("link");
var i, l, styles = [];
for (i = 0, l = links.length; i < l; i++) {
  chan.call({
    method: 'style',
    params: { stylesheet: links[i].href },
    success: function () {
      console.log("Applied stylesheet");
    },
    error: function (e) {
      console.log(e);
    }
  });
}

chan.bind('has-list', function (trans, data) {
  console.log("Woot - list exists");
});

chan.bind('wants', function (trans, params) {
  console.log('WANT', params.what, params.data);
});

chan.bind('has', function (trans, params) {
  var key, msg, buffer = [];
  if (params.what === 'items') {
    itemsMsgs[params.data.key] = params.data;
  }
  for (key in itemsMsgs) {
    msg = itemsMsgs[key];
    if (msg.ids && msg.ids.length) {
      buffer.push(msg.type + ' (' + msg.categories + '): ' + msg.id.join(', '));
    } else if (msg.id) {
      buffer.push(msg.type + ' (' + msg.categories + '): ' + msg.id.join(', '));
    }
  }
  document.getElementById('stdout').innerHTML = buffer.join('\n');
});

// Kickoff.
loadList();
