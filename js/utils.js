/*jslint browser: true, devel: true, white: true */
/*global
$,window,
AWS,AWSConstants
*/


var Utils = (function () {
  'use strict';
  var
    loadingTimeoutHandle,
    s4 = function () {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    },
    guid = function () {
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    },
    percentage = function (number1, number2) {
      return number2 === 0 ? 0 : (number1 === number2 ? 100 : ((number1 / number2) * 100).toFixed(2));
    },
    progressBar = function progress(number1, number2, $element) {
      var percent = percentage(number1, number2),
        progressBarWidth = percent * $element.width() / 100;
      $element.find(':nth-child(3)>div').removeClass();
      if (percent > 60) {
        $element.find(':nth-child(3)>div').addClass('success');
      } else if (percent < 20) {
        $element.find(':nth-child(3)>div').addClass('danger');
      } else {
        $element.find(':nth-child(3)>div').addClass('warning');
      }
      $element.find(':nth-child(3)>div').animate({
        width: progressBarWidth
      }, 500);
      $element.find(':nth-child(2)').html(number1 + ' / ' + number2);
    };
  return {

    // var p = [userKey];
    // var f = function (s) { if (s != "-1") fillLogSubscriptions(s); else showMessage(texts[1]); };
    // json(p, 'GetUserLogSubscriptions', f);
    apiJsonCall: function (p, c, f, fe, url, k) {
      var jsonText = p ? JSON.stringify(p) : null,
        headers = k !== undefined ? {
          'Content-Type': 'application/json',
          'X-Api-Key': k
        } : {
            'Content-Type': 'application/json',
            'Authorization': Cookies.get('idToken'),
            'IdentityId': AWS.config.credentials.identityId
          };

      $.ajax({
        method: 'POST',
        url: (url || AWSConstants.apiEndpoint) + c,
        data: jsonText,
        headers: headers,
        dataType: 'json',
        success: function (response) {
          if (f) {
            f(response);
          } else {
            Utils.ready();
          }
        },
        error: function (xhr, textStatus, errorThrown) {
          if (fe) {
            fe(xhr, textStatus, errorThrown);
          } else {
            Utils.ready();
            console.log('unexpected error on AJAX call');
          }
        }
      });
    },
    newGuid: function () {
      return guid();
    },
    percentage: function (n1, n2) {
      return percentage(n1, n2);
    },
    localTimestamp: function () {
      return new Date().toLocaleString();
    },
    timestampToLocal: function (t) {
      return new Date(t).toLocaleString();
    },
    progressBar: function (n1, n2, $element) {
      progressBar(n1, n2, $element);
    },
    showTemporaly: function (selector) {
      $(selector).show();
      setTimeout(function () {
        $(selector).fadeOut();
      }, 3000);
    },
    notify: function (m) {
      if ($.notify) {
        $.notify({
          message: m
        });
      }
    },
    getUrlContent: function (url, f, fe) {
      $.ajax({
        type: "GET",
        url: url,
        success: function (response) {
          if (f) {
            f(response);
          } else {
            Utils.ready();
          }
        },
        error: function (xhr, textStatus, errorThrown) {
          if (fe) {
            fe(xhr, textStatus, errorThrown);
          } else {
            Utils.ready();
            console.log('unexpected error on AJAX call');
          }
        }
      });
    },
    getUrlParameter: function getUrlParameter(sParam) {
      var
        sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName, i;
      for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[ i ].split('=');
        if (sParameterName[ 0 ] === sParam) {
          return sParameterName[ 1 ] === undefined ? false : sParameterName[ 1 ];
        }
      }
      return false;
    },
    resetExceptions: function () {
      $('.Exception').hide();
    },
    ready: function (button, disabledCheck) {
      $('.btn:not(.btn-noaction)').not('.editor-command').removeClass('disabled');
      if (button) {
        if (disabledCheck) {
          $('#' + button + '-loading').hide();
        } else {
          $('#' + button + '-loading').removeClass('fa-circle-o-notch fa-spin').addClass('fa-check text-success').fadeIn();
          setTimeout(function () {
            $('#' + button + '-loading').hide().removeClass('fa-check text-success').addClass('fa-circle-o-notch fa-spin');
          }, 3000);
        }
      } else {
        $('.loading').hide();
      }
    },
    loading: function (button) {
      $('.loading-long').hide(); clearTimeout(loadingTimeoutHandle);
      $('.btn:not(.btn-noaction)').not('.editor-command').addClass('disabled');
      if (button) {
        $('#' + button + '-loading').show();
        loadingTimeoutHandle = setTimeout(function () { $('#' + button + '-loading-long').show(); }, 2000);
      } else {
        $('.loading').show();
        loadingTimeoutHandle = setTimeout(function () { $('.loading-long').show(); }, 2000);
      }
      
    },
    goHome: function () {
      window.location.href = "index.html";
    },
    daysInMonth: function (month, year) {
      return new Date(year, month, 0).getDate();
    },
    sortedDaysInMonthArray: function (month, year) {
      var
        monthDaysArray = [],
        monthDays = new Date(year, month, 0).getDate(),
        i = 0;
      for (i = 0; i < monthDays; i++) {
        monthDaysArray.push(i + 1);
      }
      monthDaysArray.sort(function (a, b) {
        return a - b;
      });
      monthDaysArray.length = monthDays;
      return monthDaysArray;
    },
    sortedDaysInMonthArrayTillToday: function (month, year) {
      var
        monthDaysArray = [],
        today = new Date().getDate(),
        monthDays = new Date(year, month, 0).getDate(),
        i = 0;
      for (i = 0; i < monthDays && i < today; i++) {
        monthDaysArray.push(i + 1);
      }
      monthDaysArray.sort(function (a, b) {
        return a - b;
      });
      monthDaysArray.length = today;
      return monthDaysArray;
    },
    matchCount: function (s, text) {
      return text.split(s).length - 1;
    },
    getPrice: function (n) {
      return parseFloat(Math.round(n * 100) / 100).toFixed(2);
    },
    setActive: function (o) {
      $(o).addClass('active');
    },
    pad: function pad(num, size) {
      var s = num + "";
      while (s.length < size) s = "0" + s;
      return s;
    },
    timeOffset: function () {
      var offset = new Date().getTimezoneOffset();
      return (offset.toString().substr(0, 1) === '-' ? '+' : '-') + Utils.pad(offset.toString().substr(1) / 60, 2);
    },
    isCallback:function(callback){
      if (typeof callback !== 'undefined' && $.isFunction(callback)) {
        return true;
      }else{
        return false;
      }
    },
    callCallback: function(callback){
      if (typeof callback !== 'undefined' && $.isFunction(callback)) {
            callback();
      }
    }
  };
}());

$(function () {
  'use strict';
  $.validator.addMethod("noSpace", function (value, element) {
    return value.indexOf(" ") < 0 && value !== "";
  }, "Please do not use space");
  $.validator.addMethod("domain", function (value, element) {
    return this.optional(element) || /^([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9\-]+\.[a-zA-Z]{2,6}?$/i.test(value);
  }, "Please enter a valid damain name");
  $.validator.addMethod("url", function (value, element) {
    return this.optional(element) || /^(http:\/\/|https:\/\/)([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9\-]+\.[a-zA-Z]{2,6}?$/i.test(value);
  }, "Please enter a valid url");
  $(".no-space-underscore").keyup(function () {
    this.value = this.value.replace(/ /g, "_");
  });
  $(".no-space-hyphen").keyup(function () {
    this.value = this.value.replace(/ /g, "-");
  });
  $(".no-space").keyup(function () {
    this.value = this.value.replace(/ /g, "");
  });
  $(".only-letters-no-space-underscore").keyup(function () {
    this.value = this.value.replace(/[^a-zA-Z0-9\_ ]+/g, "").replace(/ /g, "_");
  });
  $(".only-letters").keyup(function () {
    this.value = this.value.replace(/[^a-zA-Z0-9]+/g, "");
  });
  $(".us-price").keyup(function () {
    this.value = this.value.replace(/[^0-9\.]+/g, "");

  });
  $(".only-letters-no-space-hyphen").keyup(function () {
    this.value = this.value.replace(/[^a-zA-Z0-9\- ]+/g, "").replace(/ /g, "-");
  });
  $('.btn:not(.btn-noaction)').each(function () {
    $(this).on("click", function (e) {
      e.preventDefault();
      $(this).addClass('disabled');
      $('#' + $(this).attr('id') + '-loading').show();
    });
  });
  if (!String.prototype.startsWith) {
    (function () {
      // needed to support `apply`/`call` with `undefined`/`null`
      var defineProperty = (function () {
        // IE 8 only supports `Object.defineProperty` on DOM elements
        try {
          var object = {},
            $defineProperty = Object.defineProperty,
            result = $defineProperty(object, object, object) && $defineProperty;
          return result;
        } catch (error) { }
      }());
      var
        toString = {}.toString,
        startsWith = function (search) {
          if (this == null) {
            throw TypeError();
          }
          var string = String(this);
          if (search && toString.call(search) == '[object RegExp]') {
            throw TypeError();
          }
          var stringLength = string.length;
          var searchString = String(search);
          var searchLength = searchString.length;
          var position = arguments.length > 1 ? arguments[ 1 ] : undefined;
          // `ToInteger`
          var pos = position ? Number(position) : 0;
          if (pos != pos) { // better `isNaN`
            pos = 0;
          }
          var start = Math.min(Math.max(pos, 0), stringLength);
          // Avoid the `indexOf` call if no match is possible
          if (searchLength + start > stringLength) {
            return false;
          }
          var index = -1;
          while (++index < searchLength) {
            if (string.charCodeAt(start + index) != searchString.charCodeAt(index)) {
              return false;
            }
          }
          return true;
        };
      if (defineProperty) {
        defineProperty(String.prototype, 'startsWith', {
          'value': startsWith,
          'configurable': true,
          'writable': true
        });
      } else {
        String.prototype.startsWith = startsWith;
      }
    }());
  }
});
