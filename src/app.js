// python -m SimpleHTTPServer 8080
angular.module('recipeApp',
  [
    'ngRoute',
    'firebase',
    'ngMaterial',
    'ngAnimate'
  ])
  .config(function($routeProvider, $locationProvider) {
    $routeProvider
    .when('/recipes/:recipeID/edit/:mode?', {
      templateUrl: 'templates/recipe_form.html',
      controller: 'rpMainContentCtrl'
    })
    .when('/recipes/:recipeID', {
      templateUrl: 'templates/recipe.html',
      controller: 'rpMainContentCtrl'
    })
    .when('/login', {
      templateUrl: 'templates/login.html',
      controller: 'rpLoginCtrl'
    })
    .when('/create_user', {
      templateUrl: 'templates/create_user.html',
      controller: 'rpCreateUserCtrl'
    })
    .when('/', {
      templateUrl: 'templates/welcome.html',
      controller: 'rpWelcomeCtrl'
    })
    .otherwise( '/' );
  })
  .constant('rpCurrentUser', {
    email: ''
  })
  .factory('rpFirebase', function( $location ) {
    var ref = new Firebase("https://flickering-fire-9407.firebaseio.com/");
    window.ref = ref;
    return {
      get: function( noRedirect, customRef ) {
        var currentRef = ref;
        if ( customRef ) {
          currentRef = new Firebase("https://flickering-fire-9407.firebaseio.com/" + customRef);
        }
        if ( currentRef.getAuth() == null && !noRedirect ) {
          $location.url('/login');
        }
        return currentRef;
      }
    }
  })
  .factory('rpRecipesModel', function( $firebase, rpFirebase) {
    var ref = rpFirebase.get( false, 'recipes/');
    var sync = $firebase(ref);

    return {
      get: function () {
        return sync.$asArray();
      },
      add: function( recipe ) {
        return sync.$asArray().$add( recipe );
      }
    }
  })
  .factory('rpUsers', function( $q, $rootScope, rpCurrentUser ) {
    var ref = new Firebase("https://flickering-fire-9407.firebaseio.com/");
    return {
      createUser: function( credentials ) {
        var self = this;
        var dfd = $q.defer();

        ref.createUser(credentials, function( error ) {
          if ( error ) {
            dfd.reject(error);
          }
          else {
            self.login( credentials ).then(function(userInfo) {
              ref.child('users').child(userInfo.uid).set({
                email: userInfo.password.email
              });
              dfd.resolve( userInfo );
            });
          }
        });

        return dfd.promise;
      },
      login: function( credentials ) {
        var dfd = $q.defer();
        ref.authWithPassword(credentials, function( error, userInfo ) {
          if ( error == null ) {
            $rootScope.$apply(function() {
              console.log('good login');
              rpCurrentUser.email = userInfo.password.email;
              dfd.resolve(userInfo);
            })
          }
          else {
            console.log('bad login');
            dfd.reject(error);
          }
        });
        return dfd.promise;
      }
    }
  })
  .controller('rpNavPaneCtrl', function( $scope, $location, $routeParams, $materialSidenav, rpRecipesModel ) {
    $scope.recipes = rpRecipesModel.get();
    $scope.routeParams = $routeParams;

    $scope.openRecipe = function( recipe ) {
      $location.url('/recipes/' + recipe.$id );
      $materialSidenav('left').close();
    };

    $scope.createRecipe = function() {
      var id = $scope.recipes.length;
      rpRecipesModel.add({
        id: id,
        ingredients: [
          {
            description: '',
            quantity: null,
            units: ''
          }
        ],
        name: 'New Recipe ' + id,
        steps: [
          {
            description: ''
          }
        ]
      }).then(function( newRecipe ) {
        $location.url('/recipes/' + newRecipe.name() + '/edit/create');
      });
    }
  })
  .controller('rpMainContentCtrl', function( $scope, $routeParams, $location, $materialToast, $materialDialog, $materialSidenav, rpRecipesModel ) {
    var recipes = rpRecipesModel.get();

    recipes.$loaded().then(function() {
      $scope.recipe = recipes.$getRecord( $routeParams.recipeID );
    });

    $scope.isCreateMode = $routeParams.hasOwnProperty('mode');

    $scope.addIngedient = function() {
      $scope.recipe.ingredients.push({
        description: '',
        quantity: 1,
        units: ''
      });
    };

    $scope.addStep = function() {
      $scope.recipe.steps.push({
        description: ''
      });
    };

    $scope.deleteRecipe = function() {
      $materialDialog.show({
        templateUrl: 'templates/delete_confirm.html',
        controller: 'rpDeleteConfirmDialogCtrl'
      }).then(function( message ) {
        if ( message === 'yes' ) {
          recipes.$remove( $scope.recipe ).then(function() {
            $location.url('/recipes/' + recipes[0].$id );
          })
        }
      });
    };

    $scope.editRecipe = function() {
      $location.url('/recipes/' + $scope.recipe.$id + '/edit');
    };

    $scope.doneEditing = function() {
      $location.url('/recipes/' + $scope.recipe.$id);
    };

    var save = _.debounce(function() {
      recipes.$save( $scope.recipe ).then(function() {
        $materialToast.show({
          template: '<material-toast>Recipe Saved:<br/><br/>' + $scope.recipe.name + '</material-toast>',
          duration: 2000,
          position: 'top right'
        });
      });
    }, 5000);

    $scope.$watch( 'recipe', function( oldRecipe, newRecipe ) {
      if ( oldRecipe && newRecipe && !angular.equals(oldRecipe, newRecipe) ) {
        save();
      }
    }, true);

    $scope.showNavPane = function() {
      $materialSidenav('left').toggle();
    }
  })
  .controller('rpDeleteConfirmDialogCtrl', function( $scope, $materialDialog ) {
    $scope.answer = function( message ) {
      $materialDialog.hide(message);
    };
  })
  .controller('rpWelcomeCtrl', function( $scope, $materialSidenav ) {
    $scope.showNavPane = function() {
      $materialSidenav('left').toggle();
    }
  })
  .controller('rpLoginCtrl', function( $scope, $location, rpUsers ) {
    $scope.credentials = {};
    $scope.login = function() {
      rpUsers.login($scope.credentials).then(function() {
        $location.url('/');
      });
    }
  })
  .controller('rpCreateUserCtrl', function( $scope, $location, rpUsers ) {
    $scope.credentials = {};
    $scope.create = function() {
      rpUsers.createUser($scope.credentials).then(function() {
        $location.url('/');
      });
    }
  });
