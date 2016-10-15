'use strict';

var config = require('../../server/config.json');
var path = require('path');

module.exports = function(User) {
	 User.afterRemote('create', function(context, user, next) {
    console.log('> user.afterRemote triggered');

    var options = {
      type: 'email',
      to: user.email,
      from: 'noreply@coolendar.com',
      subject: 'Thanks for registering.',
      redirect: '/coolendar-official',
      user: user
    };

    user.verify(options, function(err, response) {
      if (err) {
        User.deleteById(user.id);
        return next(err);
      }

      console.log('> verification email sent:', response);

      context.res.render('response', {
        title: 'Signed up successfully',
        content: 'Please check your email and click on the verification link ' +
            'before logging in.',
        redirectTo: '/',
        redirectToLinkText: 'Log in'
      });
    });
  });

  //send password reset link when requested
  User.on('resetPasswordRequest', function(info) {
    var url = 'http://' + config.host + ':' + config.port + '/reset-password';
    var html = 'Click <a href="' + url + '?access_token=' +
        info.accessToken.id + '">here</a> to reset your password';

    User.app.models.Email.send({
      to: info.email,
      from: info.email,
      subject: 'Password reset',
      html: html
    }, function(err) {
      if (err) return console.log('> error sending password reset email');
      console.log('> sending password reset email to:', info.email);
    });
  });

  User.changePassword = function(req, callback) {
      console.log(req);
    if (!req.accessToken.id) callback("Invalid Token");

    //verify passwords match
    if (!req.body.password ||
        !req.body.confirmation ||
        req.body.password !== req.body.confirmation) {
      callback('Passwords do not match');
    }

    User.findById(req.accessToken.userId, function(err, user) {
      if (err) callback('Invalid token');
      user.updateAttribute('password', req.body.password, function(err, user) {
      if (err) callback('Failed to change password');
        console.log('> password reset processed successfully');
          callback(null, "Password changed successfully");
      });
    });
  };
  User.remoteMethod(
      'changePassword',
      {
          http: {
              path: '/changePassword', 
              verb: 'post',
              status: 200,
              errorStatus: 400
          },
          accepts: {
              arg: 'req', type: 'object', 'http': {source: 'req'},
          },
          returns: {arg: 'message', type: 'string'}
      }
  );
};
