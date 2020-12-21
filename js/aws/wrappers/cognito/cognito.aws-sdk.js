/*jslint browser: true, devel: true, white: true */
/*global
$,window,AWS,AWSCognito,
Cookies,JSON,
AWSPageInit,Cognito
Utils
*/
var
  AWSSDKArgs = document.getElementById('aws-cognito-services-sdk'),
  AWSConstants = {
    region: AWSSDKArgs.getAttribute('data-region'),
    cognitoEndpoint: 'cognito-idp.' + AWSSDKArgs.getAttribute('data-region') + '.amazonaws.com',
    userPoolId: AWSSDKArgs.getAttribute('data-userPoolId'),
    clientId: AWSSDKArgs.getAttribute('data-clientId'),
    identityPoolId: AWSSDKArgs.getAttribute('data-identityPoolId'),
    samlDomain: AWSSDKArgs.getAttribute('data-samlDomain'),
    samlIdentifier: AWSSDKArgs.getAttribute('data-samlIdentifier'),
    samlRedirect: AWSSDKArgs.getAttribute('data-samlRedirect'),
    samlEndpoint: 'https://' + AWSSDKArgs.getAttribute('data-samlDomain') + '.auth.eu-west-1.amazoncognito.com/authorize?idp_identifier=' + AWSSDKArgs.getAttribute('data-samlIdentifier') + '&response_type=code&client_id=' + AWSSDKArgs.getAttribute('data-clientId') +  '&redirect_uri=' + AWSSDKArgs.getAttribute('data-samlRedirect'),
    samlTokenEndpoint: 'https://' + AWSSDKArgs.getAttribute('data-samlDomain') + '.auth.eu-west-1.amazoncognito.com/oauth2/token',
    /* apiEndpoint must implement cognito/reset and cognito/confirm APIs for email/password users */
    apiEndpoint: AWSSDKArgs.getAttribute('data-apiEndpoint')
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
var
  userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
    UserPoolId: AWSConstants.userPoolId,
    ClientId: AWSConstants.clientId
  });

/* for logged user */
var
  cognitoUser = null,
  refreshToken = Cookies.get('refreshToken');

var
  Cognito = (function () {
    "use strict";
    return {
      signup: function (email, password, callbackSuccess, callbackError) {
        var
          attributeList = [],
          dataEmail = {
            Name: 'email',
            Value: email.toLowerCase()
          },
          attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
        attributeList.push(attributeEmail);
        userPool.signUp(Utils.newGuid(), password, attributeList, null, function (err, result) {
          if (err) {
            if (callbackError !== 'undefined' && $.isFunction(callbackError)) {
              callbackError(err);
            }
          } else {
            cognitoUser = result.user;
            if (callbackSuccess !== 'undefined' && $.isFunction(callbackSuccess)) {
              callbackSuccess();
            }
          }
        });
      },
      verify: function (code, callbackSuccess, callbackError) {
        cognitoUser.confirmRegistration(code, true, function (err, result) {
          if (err) {
            if (callbackError !== 'undefined' && $.isFunction(callbackError)) {
              callbackError(err);
            }
          } else {
            if (callbackSuccess !== 'undefined' && $.isFunction(callbackSuccess)) {
              callbackSuccess();
            }
          }
        });
      },
      resend: function (callbackSuccess, callbackError) {
        cognitoUser.resendConfirmationCode(function (err, result) {
          if (err) {
            if (callbackError !== 'undefined' && $.isFunction(callbackError)) {
              callbackError(err);
            }
          } else {
            if (callbackSuccess !== 'undefined' && $.isFunction(callbackSuccess)) {
              callbackSuccess();
            }
          }
        });
      },
      signin: function (email, password, callbackSuccess, callbackError) {
        var
          authenticationData = {
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
            if (callbackSuccess !== 'undefined' && $.isFunction(callbackSuccess)) {
              callbackSuccess();
            }
          },
          onFailure: function (err) {
            if (callbackError !== 'undefined' && $.isFunction(callbackError)) {
              callbackError(err);
            }
          }
        });
      },     
      samlSignin: function (loginin, callback,fe) {
        /* https://tools.ietf.org/html/rfc6749#section-4.1 */
        if (window.location.href.indexOf(AWSSDKArgs.getAttribute('data-frontpage')) > 0 && Utils.getUrlParameter("code")) {   
          Utils.callCallback(loginin);
          /* ask for tokens */
          $.ajax({
            method: 'POST',
            url: AWSConstants.samlTokenEndpoint,
            data: 'grant_type=authorization_code&client_id=' +  AWSConstants.clientId + '&code=' + Utils.getUrlParameter("code") + '&redirect_uri=' + AWSConstants.samlRedirect,
            headers: {
              'content-type':'application/x-www-form-urlencoded'
            },
            dataType: 'json',
            success: function (response) {
              console.log(response);
              Cookies.set('accessToken', response.access_token);
              Cookies.set('idToken', response.id_token);
              Cookies.set('refreshToken', response.refresh_token);
              window.location.href = AWSSDKArgs.getAttribute('data-home');
            },
            error: function (xhr, textStatus, errorThrown) {
              if (Utils.isCallback(fe)) {
                fe(xhr, textStatus, errorThrown);
              } else {
                Utils.ready();
                console.log('unexpected error on AJAX call');
              }
            }
          });
           
        }else{
          Utils.callCallback(callback);       
        } 
      },
      refreshTokens: function (callback) {
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
            logins[ AWSConstants.cognitoEndpoint + "/" + AWSConstants.userPoolId ] = authResult.AuthenticationResult.IdToken;
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
            console.log(err, err.stack);
            Cognito.logout();
          }
        });
        setTimeout(Cognito.refreshTokens, 300000); // refresh after 5 minutes.
        if (typeof callback !== 'undefined' && $.isFunction(callback)) {
          callback();
        }
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
        if (window.location.href.indexOf('127.0.0.1:') <= 0) {
          window.location.href = AWSSDKArgs.getAttribute('data-frontpage');
        } else {
          window.location.href = '/src/UI/index.html';
        }
      },
      initializePageAuthentication: function (callback) {
        if (window.location.href.indexOf(AWSSDKArgs.getAttribute('data-frontpage')) <= 0) {
          if (!Cookies.get('idToken') || !Cookies.get('refreshToken')) {
            Cognito.logout();
          } else {
            Cognito.refreshTokens(callback);
          }
        } else {
          if (typeof callback !== 'undefined' && $.isFunction(callback)) {
            callback();
          }
        }
      }
    };
  }());
