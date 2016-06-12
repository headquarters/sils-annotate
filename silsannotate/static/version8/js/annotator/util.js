// Generated by CoffeeScript 1.7.1
var $, Util, gettext, _gettext, _ref, _t;

gettext = null;

if (typeof Gettext !== "undefined" && Gettext !== null) {
  _gettext = new Gettext({
    domain: "annotator"
  });
  gettext = function(msgid) {
    return _gettext.gettext(msgid);
  };
} else {
  gettext = function(msgid) {
    return msgid;
  };
}

_t = function(msgid) {
  return gettext(msgid);
};

if (!(typeof jQuery !== "undefined" && jQuery !== null ? (_ref = jQuery.fn) != null ? _ref.jquery : void 0 : void 0)) {
  console.error(_t("Annotator requires jQuery: have you included lib/vendor/jquery.js?"));
}

if (!(JSON && JSON.parse && JSON.stringify)) {
  console.error(_t("Annotator requires a JSON implementation: have you included lib/vendor/json2.js?"));
}

$ = jQuery;

Util = {};

Util.flatten = function(array) {
  var flatten;
  flatten = function(ary) {
    var el, flat, _i, _len;
    flat = [];
    for (_i = 0, _len = ary.length; _i < _len; _i++) {
      el = ary[_i];
      flat = flat.concat(el && $.isArray(el) ? flatten(el) : el);
    }
    return flat;
  };
  return flatten(array);
};

Util.contains = function(parent, child) {
  var node;
  node = child;
  while (node != null) {
    if (node === parent) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
};

Util.getTextNodes = function(jq) {
  var getTextNodes;
  getTextNodes = function(node) {
    var nodes;
    if (node && node.nodeType !== Node.TEXT_NODE) {
      nodes = [];
      if (node.nodeType !== Node.COMMENT_NODE) {
        node = node.lastChild;
        while (node) {
          nodes.push(getTextNodes(node));
          node = node.previousSibling;
        }
      }
      return nodes.reverse();
    } else {
      return node;
    }
  };
  return jq.map(function() {
    return Util.flatten(getTextNodes(this));
  });
};

Util.getLastTextNodeUpTo = function(n) {
  var result;
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n;
    case Node.ELEMENT_NODE:
      if (n.lastChild != null) {
        result = Util.getLastTextNodeUpTo(n.lastChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.previousSibling;
  if (n != null) {
    return Util.getLastTextNodeUpTo(n);
  } else {
    return null;
  }
};

Util.getFirstTextNodeNotBefore = function(n) {
  var result;
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n;
    case Node.ELEMENT_NODE:
      if (n.firstChild != null) {
        result = Util.getFirstTextNodeNotBefore(n.firstChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.nextSibling;
  if (n != null) {
    return Util.getFirstTextNodeNotBefore(n);
  } else {
    return null;
  }
};

Util.readRangeViaSelection = function(range) {
  var sel;
  sel = Util.getGlobal().getSelection();
  sel.removeAllRanges();
  sel.addRange(range.toRange());
  return sel.toString();
};

Util.xpathFromNode = function(el, relativeRoot) {
  var exception, result;
  try {
    result = simpleXPathJQuery.call(el, relativeRoot);
  } catch (_error) {
    exception = _error;
    console.log("jQuery-based XPath construction failed! Falling back to manual.");
    result = simpleXPathPure.call(el, relativeRoot);
  }
  return result;
};

Util.nodeFromXPath = function(xp, root) {
  var idx, name, node, step, steps, _i, _len, _ref1;
  steps = xp.substring(1).split("/");
  node = root;
  for (_i = 0, _len = steps.length; _i < _len; _i++) {
    step = steps[_i];
    _ref1 = step.split("["), name = _ref1[0], idx = _ref1[1];
    idx = idx != null ? parseInt((idx != null ? idx.split("]") : void 0)[0]) : 1;
    node = findChild(node, name.toLowerCase(), idx);
  }
  return node;
};

Util.escape = function(html) {
  return html.replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

Util.uuid = (function() {
  var counter;
  counter = 0;
  return function() {
    return counter++;
  };
})();

Util.getGlobal = function() {
  return (function() {
    return this;
  })();
};

Util.maxZIndex = function($elements) {
  var all, el;
  all = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = $elements.length; _i < _len; _i++) {
      el = $elements[_i];
      if ($(el).css('position') === 'static') {
        _results.push(-1);
      } else {
        _results.push(parseFloat($(el).css('z-index')) || -1);
      }
    }
    return _results;
  })();
  return Math.max.apply(Math, all);
};

Util.mousePosition = function(e, offsetEl) {
  var offset, _ref1;
  if ((_ref1 = $(offsetEl).css('position')) !== 'absolute' && _ref1 !== 'fixed' && _ref1 !== 'relative') {
    offsetEl = $(offsetEl).offsetParent()[0];
  }
  offset = $(offsetEl).offset();
  return {
    top: e.pageY - offset.top,
    left: e.pageX - offset.left
  };
};

Util.preventEventDefault = function(event) {
  return event != null ? typeof event.preventDefault === "function" ? event.preventDefault() : void 0 : void 0;
};


