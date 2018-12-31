/*jslint browser: true, devel: true, white: true */
/*global
$,AWS,AWSCognito,
Cookies,JSON,
AWSPageInit
Utils
*/
var AWSSDKArgs = document.getElementById('aws-cognito-services-sdk');
var AWSConstants = {
  region: AWSSDKArgs.getAttribute('data-region'),
  cognitoEndpoint: 'cognito-idp.' + AWSSDKArgs.getAttribute('data-region') + '.amazonaws.com',
  userPoolId: AWSSDKArgs.getAttribute('data-userPoolId'),
  clientId: AWSSDKArgs.getAttribute('data-clientId'),
  identityPoolId: AWSSDKArgs.getAttribute('data-identityPoolId'),
  cognitoApiGateway: AWSSDKArgs.getAttribute('data-cognitoApiGateway'),
  webApiGateway: AWSSDKArgs.getAttribute('data-webApiGateway'),
};
/* Initialize AWS SDK global configs */
AWS.config.region = AWSConstants.region;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: AWSConstants.identityPoolId
});
AWSCognito.config.region = AWSConstants.region;
AWSCognito.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: AWSConstants.identityPoolId
});
var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
  UserPoolId: AWSConstants.userPoolId,
  ClientId: AWSConstants.clientId
});
/* for logged user */
var cognitoUser = null,
  email = null,
  password = null,
  token = Cookies.get('idToken'),
  refreshToken = Cookies.get('refreshToken');

var AWSUtils = (function () {
  "use strict";
  return {
    refreshTokens: function () {
      userPool.client.makeUnauthenticatedRequest('initiateAuth', {
        ClientId: AWSConstants.clientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          "REFRESH_TOKEN": refreshToken
        }
      }, function (err, authResult) {
        if (!err) {
          Cookies.set('accessToken', authResult.AuthenticationResult.AccessToken);
          Cookies.set('idToken', authResult.AuthenticationResult.IdToken);
          var logins = {};
          logins[AWSConstants.cognitoEndpoint + "/" + AWSConstants.userPoolId] = authResult.AuthenticationResult.IdToken;
          AWS.config.update({
            credentials: new AWS.CognitoIdentityCredentials({
              IdentityPoolId: AWSConstants.identityPoolId,
              Logins: logins
            })
          });
          AWS.config.credentials.get(function (err) {
            if (err) {
              console.log(err, err.stack);
            }
          });
        } else {
          AWSUtils.logout();
        }
      });
      setTimeout(AWSUtils.refreshTokens, 3000000); // refresh after 50 minutes.
    },
    logout: function () {
      Cookies.set('accessToken', '');
      Cookies.set('idToken', '');
      Cookies.set('refreshToken', '');
      if (cognitoUser !== null) {
        cognitoUser.signOut();
        cognitoUser = null;
      }
      AWS.config.credentials.clearCachedId();
      if (typeof Utils.goHome !== 'undefined' && $.isFunction(Utils.goHome())) {
        Utils.goHome();
      } else {
        window.location.href = "index.html";
      }
    },
    initializePageAuthentication: function (pageException) {
      if (window.location.href.indexOf(pageException) <= 0) {
        if (!token || !refreshToken) {
          AWSUtils.logout();
        } else {
          // Initialize AWS SDK
          var logins = {};
          logins[AWSConstants.cognitoEndpoint + "/" + AWSConstants.userPoolId] = token;
          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: AWSConstants.identityPoolId,
            Logins: logins
          });
          AWSUtils.refreshTokens();
          AWS.config.credentials.get(function (err) {
            if (err) {
              console.log(err, err.stack);
            } else {
              if (typeof AWSPageInit !== 'undefined' && $.isFunction(AWSPageInit)) {
                AWSPageInit();
              }
            }
          });
        }
      }
    }
  };
}());

$(function () {
  "use strict";
  AWSUtils.initializePageAuthentication('index.html');
});

/****************************************************/
/* HTML elements:									                  */
/*	[inputs]										                    */
/*  - register-email								                */
/*  - register-password								              */
/*  - verify-code									                  */
/*	[buttons]										                    */
/*  - btn-register									                */
/*  - btn-verify									                  */
/*  - btn-verify-resend								              */
/****************************************************/
var RegistrationForm = (function () {
  "use strict";
  var signupCallBack = null,
    confirmCallback = null,
    signup = function () {
      $('.Exception').hide();
      var attributeList = [],
        dataEmail = {
          Name: 'email',
          Value: email.toLowerCase()
        },
        attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
      attributeList.push(attributeEmail);
      userPool.signUp(Utils.newGuid(), password, attributeList, null, function (err, result) {
        Utils.ready();
        if (err) {
          console.log(err);
          showRegistrationError(err);
          return;
        }
        cognitoUser = result.user;
        $('.registration').toggle();

        if (typeof signupCallBack !== 'undefined' && $.isFunction(signupCallBack)) {
          signupCallBack();
        }
      });
    },
    verify = function (code) {
      $('.Exception').hide();
      cognitoUser.confirmRegistration(code, true, function (err, result) {
        Utils.ready();
        if (err) {
          showRegistrationError(err);
          return;
        }
        if (typeof confirmCallback !== 'undefined' && $.isFunction(confirmCallback)) {
          confirmCallback();
        }
        LoginForm.login();
      });
    },
    resend = function () {
      $('.Exception').hide();
      cognitoUser.resendConfirmationCode(function (err, result) {
        Utils.ready();
        if (err) {
          showRegistrationError(err);
          return;
        }
        $('.register-codesent').show();
      });
    },
    showRegistrationError = function (err) {
      switch (err.code) {
        case "InvalidParameterException":
          $('.register-InvalidParameterException').show();
          break;
        case "UsernameExistsException":
          $('.register-UsernameExistsException').show();
          break;
        case "CodeMismatchException":
          $('.register-CodeMismatchException').show();
          break;
        case "UserLambdaValidationException":
          $('.register-UsernameExistsException').show();
          break;
        default:
          $('.register-UnexpectedException').show();
          break;
      }
    },
    initForm = function () {
      $('.js-validation-register').validate({
        errorClass: 'help-block text-right animated fadeInDown',
        errorElement: 'div',
        errorPlacement: function (error, e) {
          $(e).parents('.form-group > div').append(error);
        },
        highlight: function (e) {
          $(e).closest('.form-group').removeClass('has-error').addClass('has-error');
          $(e).closest('.help-block').remove();
        },
        success: function (e) {
          $(e).closest('.form-group').removeClass('has-error');
          $(e).closest('.help-block').remove();
        },
        rules: {
          'register-email': {
            required: true,
            email: true
          },
          'register-password': {
            required: true,
            minlength: 6
          }
        },
        messages: {
          'register-email': 'Please enter a valid email address',
          'register-password': {
            required: 'Please provide a password',
            minlength: 'Your password must be at least 6 characters long'
          }
        }
      });
      $('.js-validation-verify').validate({
        errorClass: 'help-block text-right animated fadeInDown',
        errorElement: 'div',
        errorPlacement: function (error, e) {
          $(e).parents('.form-group > div').append(error);
        },
        highlight: function (e) {
          $(e).closest('.form-group').removeClass('has-error').addClass('has-error');
          $(e).closest('.help-block').remove();
        },
        success: function (e) {
          $(e).closest('.form-group').removeClass('has-error');
          $(e).closest('.help-block').remove();
        },
        rules: {
          'verify-code': {
            required: true
          }
        },
        messages: {
          'verify-code': {
            required: 'Please provide a code'
          }
        }
      });
      $('#btn-register').on("click", function (e) {
        e.preventDefault();
        if ($('.js-validation-register').valid() /* && myCaptchaResponse!=null */) {
          email = $('#register-email').val();
          password = $('#register-password').val();
          signup();
        } else {
          Utils.ready();
        }
      });
      $('#btn-verify').on("click", function (e) {
        e.preventDefault();
        if ($('.js-validation-verify').valid() /* && myCaptchaResponse!=null */) {
          verify($('#verify-code').val());
        } else {
          Utils.ready();
        }
      });
      $('#btn-verify-resend').on("click", function (e) {
        e.preventDefault();
        resend();
        Utils.ready();
      });
    };
  return {
    init: function (callBack1, callback2) {
      signupCallBack = callBack1;
      confirmCallback = callback2;
      initForm();
    }
  };
}());

/****************************************************/
/* HTML elements:									                  */
/*	[inputs]										                    */
/*  - login-username								                */
/*  - login-password								                */
/*  [buttons]										                    */
/*  - btn-login									            	      */
/****************************************************/
var LoginForm = (function () {
  "use strict";
  var loginCallback = null,
    initForm = function () {
      $('#btn-login').on("click", function (e) {
        e.preventDefault();
        if ($('#login-username').val() !== '' && $('#login-password').val() !== '') {
          email = $('#login-username').val();
          password = $('#login-password').val();
          signin();
        } else {
          Utils.ready();
        }
      });
      $("#login-password").keypress(function (e) {
        if ((e.which && e.which === 13) || (e.keyCode && e.keyCode === 13)) {
          $('#btn-login').click();
          return false;
        } else {
          return true;
        }
      });
    },
    showVerify = function () {
      $('#registration').hide();
      $('#verification').show();
      $('.how-to-use-title').hide();
      $('.how-to-use-form').show();
    },
    showLoginError = function (err) {
      switch (err.code) {
        case "UserNotFoundException":
        case "NotAuthorizedException":
          $('.login-UserNotFoundException').show();
          break;
        case "UserNotConfirmedException":
        case "PasswordResetRequiredException":
          $('.login-UserNotConfirmedException').show();
          showVerify();
          break;
        default:
          $('.login-UnexpectedException').show();
          break;
      }

    },
    signin = function () {
      $('.Exception').hide();
      var authenticationData = {
        Username: email.toLowerCase(),
        Password: password
      },
        authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData),
        userData = {
          Username: email.toLowerCase(),
          Pool: userPool
        };
      cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
          /*	Use the idToken for Logins Map when Federating User Pools with
              Cognito Identity or when passing through an Authorization Header to an API
              Gateway Authorizer
          */
          Cookies.set('accessToken', result.getAccessToken().getJwtToken());
          Cookies.set('idToken', result.idToken.jwtToken);
          Cookies.set('refreshToken', result.refreshToken.token);
          refreshToken = new AWSCognito.CognitoIdentityServiceProvider.CognitoRefreshToken({
            RefreshToken: result.refreshToken.token,
            IdToken: result.idToken.jwtToken
          });
          if (typeof loginCallback !== 'undefined' && $.isFunction(loginCallback)) {
            loginCallback();
          }
        },
        onFailure: function (err) {
          showLoginError(err);
          Utils.ready();
        }
      });
    };
  return {
    init: function (callback) {
      loginCallback = callback;
      initForm();
    },
    login: function () {
      signin();
    }
  };
}());

/****************************************************/
/* ResetPasswordForm, for *.services home pages.    */
/* HTML elements:									                  */
/*	[inputs]										                    */
/*  - email-recover									                */
/*  - password-recover								              */
/*  - code-recover									                */
/*  [buttons]										                    */
/*  - btn-recover									                  */
/*  - btn-confirm-recover							              */
/****************************************************/
var ResetPasswordForm = (function () {
  "use strict";
  var initForm = function () {
    // start reset.
    $('.js-validation-reset').validate({
      errorClass: 'help-block text-right animated fadeInDown',
      errorElement: 'div',
      errorPlacement: function (error, e) {
        $(e).parents('.form-group > div').append(error);
      },
      highlight: function (e) {
        $(e).closest('.form-group').removeClass('has-error').addClass('has-error');
        $(e).closest('.help-block').remove();
      },
      success: function (e) {
        $(e).closest('.form-group').removeClass('has-error');
        $(e).closest('.help-block').remove();
      },
      rules: {
        'email-recover': {
          required: true,
          email: true
        }
      },
      messages: {
        'email-recover': 'Please enter a valid email address'
      }
    });
    $('#btn-recover').on("click", function (e) {
      e.preventDefault();
      if ($('#email-recover').val() !== '') {
        reset($('#email-recover').val());
      } else {
        Utils.ready();
      }
    });
    // confirm reset
    $('.js-validation-reset-confirm').validate({
      errorClass: 'help-block text-right animated fadeInDown',
      errorElement: 'div',
      errorPlacement: function (error, e) {
        $(e).parents('.form-group > div').append(error);
      },
      highlight: function (e) {
        $(e).closest('.form-group').removeClass('has-error').addClass('has-error');
        $(e).closest('.help-block').remove();
      },
      success: function (e) {
        $(e).closest('.form-group').removeClass('has-error');
        $(e).closest('.help-block').remove();
      },
      rules: {
        'code-recover': {
          required: true
        },
        'password-recover': {
          required: true,
          minlength: 6
        }
      },
      messages: {
        'code-recover': {
          required: 'Please provide a code'
        },
        'password-recover': {
          required: 'Please provide a new password',
          minlength: 'Your password must be at least 6 characters long'
        }
      }
    });
    $('#btn-confirm-recover').on("click", function (e) {
      e.preventDefault();
      if ($('#email-recover').val() !== '' && $('#code-recover').val() !== '' && $('#password-recover').val() !== '') {
        resetConfirm($('#email-recover').val(), $('#code-recover').val(), $('#password-recover').val());
      } else {
        Utils.ready();
      }
    });
  },
    reset = function (e) {
      var json = {
        "email": e
      };
      $.ajax({
        method: 'POST',
        url: AWSConstants.cognitoApiGateway + 'cognito/reset',
        data: JSON.stringify(json),
        headers: {
          'Content-Type': 'application/json'
        },
        dataType: 'json',
        success: function (response) {
          Utils.ready();
          switch (response.statusCode) {
            case ResponseStatusCodes.NotFound:
              $('.recover-UserNotFound').show();
              break;
            case ResponseStatusCodes.ServiceUnavailable:
              switch (response.statusMessage) {
                case 'LimitExceededException':
                  $('.recover-LimitExeeded').show();
                  break;
                default:
                  $('.recover-UnexpectedException').show();
                  break;
              }
              break;
            case ResponseStatusCodes.OK:
              $('.recover-steps').toggle();
              break;
            default:
              $('.recover-UnexpectedException').show();
              break;
          }
        },
        error: function (xhr, textStatus, errorThrown) {
          Utils.ready();
          $('.recover-UnexpectedException').show();
        }
      });
    },
    resetConfirm = function (e, c, p) {
      var json = {
        "email": e,
        "code": c,
        "password": p
      };
      $.ajax({
        method: 'POST',
        url: AWSConstants.cognitoApiGateway + 'cognito/confirm',
        data: JSON.stringify(json),
        headers: {
          'Content-Type': 'application/json'
        },
        dataType: 'json',
        success: function (response) {
          Utils.ready();
          switch (response.statusCode) {
            case ResponseStatusCodes.NotFound:
              $('.recover-UserNotFound').show();
              break;
            case ResponseStatusCodes.ServiceUnavailable:
              switch (response.statusMessage) {
                case 'LimitExceededException':
                  $('.recover-LimitExeeded').show();
                  break;
                case 'CodeMismatchException':
                  $('.recover-InvalidCode').show();
                  break;
                case 'ExpiredCodeException':
                  $('.recover-ExpiredCodeException').show();
                  break;
                default:
                  $('.recover-UnexpectedException').show();
                  break;
              }
              break;
            case ResponseStatusCodes.OK:
              email = e;
              password = p;
              LoginForm.login();
              break;
            default:
              $('.recover-UnexpectedException').show();
              break;
          }
        },
        error: function (xhr, textStatus, errorThrown) {
          Utils.ready();
          $('.recover-UnexpectedException').show();
        }
      });
    };
  return {
    init: function () {
      initForm();
    }
  };
}());



