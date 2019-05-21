/*jslint browser: true, devel: true, white: true */
/*global
$,window,$zopim
*/
var zopimArgs = document.getElementById('zopim-sdk');
window.$zopim || (function (d, s) {
    var z = $zopim = function (c) { z._.push(c) }, $ = z.s =
        d.createElement(s), e = d.getElementsByTagName(s)[ 0 ]; z.set = function (o) {
            z.set.
                _.push(o)
        }; z._ = []; z.set._ = []; $.async = !0; $.setAttribute("charset", "utf-8");
    $.src = "https://v2.zopim.com/?" + zopimArgs.getAttribute("data-key"); z.t = +new Date; $.
        type = "text/javascript"; e.parentNode.insertBefore($, e)
})(document, "script");

$zopim(function () {
    "use strict";
    $zopim.livechat.set({
        name: 'Me (' + zopimArgs.getAttribute("data-username") + ')'
    });

    $zopim.livechat.theme.setColors({
        badge: zopimArgs.getAttribute("data-color"),
        primary: zopimArgs.getAttribute("data-color")
    });

    $zopim.livechat.theme.reload();

    $zopim.livechat.setOnStatus(function (status) {
        switch (status) {
            case 'offline':
            case 'away':
                $zopim.livechat.badge.hide();
                break;
            case 'online':
                // $zopim.livechat.badge.show();
                break;
        }
    });



    setTimeout(function () {
        try {

            // get the zopim button from inserted iframe
            var $zopimButton = $(".zopim iframe:first").contents().find(".button_bar");
            // change the button css ...
            $zopimButton.css({
                "border-radius": "0px"
            });

            // change the button position
            $('.zopim:first').addClass('zopim-button');
            // was hidden on default zopim location
            $('.zopim:first').children(':first').each(function () {
                this.style.setProperty('display', 'block', 'important');
            });
            // change the badge position
            $('.zopim:eq(1)').addClass('zopim-badge');
        } catch (err) { }

    }, 800);
});
