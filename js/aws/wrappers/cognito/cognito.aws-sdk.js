/*jslint browser: true, devel: true, white: true */
/*global
$,window,AWS,AWSCognito,
Cookies,JSON,
AWSPageInit
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
    cognitoApiGateway: AWSSDKArgs.getAttribute('data-cognitoApiGateway'),
    webApiGateway: AWSSDKArgs.getAttribute('data-webApiGateway')
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
  token = Cookies.get('idToken'),
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
            Cognito.logout();
          }
        });
        setTimeout(Cognito.refreshTokens, 3000000); // refresh after 50 minutes.
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
        window.location.href = AWSSDKArgs.getAttribute('data-home');
      },
      initializePageAuthentication: function (callback) {
        if (window.location.href.indexOf(AWSSDKArgs.getAttribute('data-home')) <= 0) {
          if (!token || !refreshToken) {
            Cognito.logout();
          } else {
            // Initialize AWS SDK
            var logins = {};
            logins[AWSConstants.cognitoEndpoint + "/" + AWSConstants.userPoolId] = token;
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
              IdentityPoolId: AWSConstants.identityPoolId,
              Logins: logins
            });
            Cognito.refreshTokens();
            AWS.config.credentials.get(function (err) {
              if (err) {
                console.log(err, err.stack);
              } else {
                if (typeof callback !== 'undefined' && $.isFunction(callback)) {
                  callback();
                }
              }
            });
          }
        } else {
          if (typeof callback !== 'undefined' && $.isFunction(callback)) {
            callback();
          }
        }
      }
    };
  }());
