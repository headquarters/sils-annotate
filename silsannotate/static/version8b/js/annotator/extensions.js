var $, gettext, _gettext, _ref, _t;

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

$ = jQuery.sub();

$.flatten = function(array) {
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

$.plugin = function(name, object) {
  return jQuery.fn[name] = function(options) {
    var args;
    args = Array.prototype.slice.call(arguments, 1);
    return this.each(function() {
      var instance;
      instance = $.data(this, name);
      if (instance) {
        return options && instance[options].apply(instance, args);
      } else {
        instance = new object(this, options);
        return $.data(this, name, instance);
      }
    });
  };
};

$.fn.textNodes = function() {
  var getTextNodes;
  getTextNodes = function(node) {
    var nodes;
    if (node && node.nodeType !== 3) {
      nodes = [];
      if (node.nodeType !== 8) {
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
  return this.map(function() {
    return $.flatten(getTextNodes(this));
  });
};

$.fn.xpath = function(relativeRoot) {
  var jq;
  jq = this.map(function() {
    var elem, idx, path;
    path = '';
    elem = this;
    while (elem && elem.nodeType === 1 && elem !== relativeRoot) {
      idx = $(elem.parentNode).children(elem.tagName).index(elem) + 1;
      idx = "[" + idx + "]";
      path = "/" + elem.tagName.toLowerCase() + idx + path;
      elem = elem.parentNode;
    }
    return path;
  });
  return jq.get();
};

$.escape = function(html) {
  return html.replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

$.fn.escape = function(html) {
  if (arguments.length) return this.html($.escape(html));
  return this.html();
};

$.fn.reverse = []._reverse || [].reverse;
