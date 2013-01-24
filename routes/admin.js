/**
 * 管理中心
 * User: willerce
 * Date: 9/17/12
 * Time: 7:40 PM
 */

var fs = require('fs');
var path = require('path');
var db = require('../global').database;
var util = require('../libs/util');
var dateformat = require('dateformat');

db.bind('shop');
db.bind('food');
db.bind('user');

exports.index = function (req, res) {
  var nowtime = util.getUTC8Time("YYYY-MM-DD HH:mm:SS");
  //var week = (new Date()).getDay().toString();
  var week = util.get_week[util.getUTC8Day()];
  if( req.session.user ){
    //这里如果用户有超级管理权限则能看到用户列表，否则为空白
    if ( req.session.user.isAdmin ){
      var isAdmin = req.session.user.isAdmin;
      db.user.find().sort( {reg_time: -1} ).toArray(function (err, users){
        return res.render('admin/index', { title: '用户管理', nowtime: nowtime, week: week, isAdmin: isAdmin, users: users})  
      });
    }else{
      return res.render('admin/index', { title:'Express', nowtime:nowtime, week:week, isAdmin: isAdmin});
    }
  }else{
      return res.redirect(config.login_path);
  }
  
};


exports.shop_index = function (req, res) {
  db.shop.find({}).toArray(function (err, result) {
    if (!err) {
      res.render('admin/shop/index', {shops:result});
    } else {
      res.render('admin/shop/index', {});
    }
  });
};

exports.shop_add = function (req, res) {
  if (req.method == "GET") {
    res.render('admin/shop/add');
  }
  else if (req.method == "POST") {
    var name = req.body.name;
    var address = req.body.address;
    var tel = req.body.tel;

    // TODO 这里需要做输入验证

    var shop = {
      'name':name,
      'address':address,
      'tel':tel,
      'categories':req.body.categories,
      'css':req.body.css,
    };

    db.shop.insert(shop, function (err, result) {
      if (!err) {
        console.log(result);
        if(req.files.picmenu && req.files.picmenu.size){
          fs.createReadStream(req.files.picmenu.path).pipe(fs.createWriteStream(path.join(__dirname, '..', 'public', 'picmenu' + result[0]._id + '.jpg'))).on('close', function(){
            res.redirect('/admin/shop');
          });
        } else {
          res.redirect('/admin/shop');
        }
      }
    });
  }
};

exports.shop_edit = function (req, res) {
  if (req.method == "GET") {
    db.shop.findOne({"_id":db.ObjectID.createFromHexString(req.params.id)}, function (err, shop) {
      res.render('admin/shop/edit', {"shop":shop});
    });
  } else if (req.method == "POST") {
    var shop = {
      'name':req.body.name,
      'address':req.body.address,
      'tel':req.body.tel,
      'categories':req.body.categories,
      'css':req.body.css,
    };

    db.shop.update({"_id":db.ObjectID.createFromHexString(req.body.id)}, {'$set':shop}, function (err) {
      if (err) {
        console.log("err");
        res.redirect('/admin/shop?msg=error&action=edit');
      } else {
        res.redirect('/admin/shop?msg=success&action=edit');
      }
    })
  }
  ;
};


exports.shop_picmenu = function (req, res) {
  db.shop.findOne({"_id":db.ObjectID.createFromHexString(req.params.id)}, function (err, shop) {
    fs.exists(path.join(__dirname, '..', 'public', 'picmenu' + req.params.id + '.jpg'), function (exists){
      shop.picmenu = exists ? '/picmenu' + req.params.id + '.jpg': '';
      console.log(shop);
      res.render('admin/shop/picmenu', {
        "shop": shop
      });
    });
  });
};

exports.shop_picmenu_upload = function(req, res){
  if(req.files.picmenu && req.files.picmenu.size){
    fs.createReadStream(req.files.picmenu.path).pipe(fs.createWriteStream(path.join(__dirname, '..', 'public', 'picmenu' + req.params.id + '.jpg'))).on('close', function(){
      res.redirect('back');
    });
  } else {
    fs.unlink(path.join(__dirname, '..', 'public', 'picmenu' + req.params.id + '.jpg'), function (err) {
      res.redirect('back');
    });
  }
};

exports.food_add = function (req, res) {
  if (req.method == 'GET') {
    db.shop.findOne({'_id':db.ObjectID.createFromHexString(req.query['shop_id'])}, function (err, shop) {
      if (!err) {
        //获取食品
        db.food.find({'shop_id':req.query['shop_id']}).sort({category:1}).toArray(function (err, foods) {
          if (!err) {
            res.render('admin/food/add', {'shop':shop, 'foods':foods, week:util.get_week});
          } else {
            console.log('获取店铺出错了，ID是：' + req.params.id);
            next();
          }
        });
      } else {
        console.log('获取店铺出错了，ID是：' + req.params.id);
      }
    });
  } else if (req.method == 'POST') {
    var shop_id = req.body.id;
    var name = req.body.name;
    var price = req.body.price;
    var week = req.body.week;
    var category = req.body.categories;

    // TODO 这里需要做输入验证

    var food = {
      'name':name,
      'price':price,
      'shop_id':shop_id,
      'week':week,
      'category':category
    };

    db.food.insert(food, function (err, result) {
      if (!err) {
        console.log(result);
        res.redirect('/admin/food/add?shop_id=' + shop_id);
      }
    });
  }
}

exports.food_edit = function (req, res) {
  if (req.method == "GET") {
    db.food.findOne({"_id":db.ObjectID.createFromHexString(req.params.id)}, function (err, food) {
      console.log(food);
      db.shop.findOne({'_id':db.ObjectID.createFromHexString(food.shop_id)}, function (err, shop) {
        res.render('admin/food/edit', {"food":food, "shop":shop});

      });
    });
  } else {
    db.food.findOne({"_id":db.ObjectID.createFromHexString(req.params.id)}, function (err, food) {
      food.name = req.body.name;
      food.price = req.body.price;
      food.week = req.body.week;
      food.category = req.body.categories;
      delete food._id;
      db.food.update({"_id":db.ObjectID.createFromHexString(req.params.id)}, {'$set':food}, function (err) {
        if (err) {
          console.log("err");
          res.redirect('/admin/food/edit/' + req.params.id + '?msg=error&action=edit');
        } else {
          res.redirect('/admin/food/edit/' + req.params.id + '?msg=success&action=edit');
        }
      });
    });
  }
};

exports.user_index = function (req, res) {
  db.user.find().toArray(function (err, users) {
    res.render('admin/user/index', {users:users});
  });
};

exports.user_delete = function (req, res) {
  var id = req.params.id;
  db.user.remove({"_id":db.ObjectID.createFromHexString(req.params.id)}, function (err, result) {
    if(!err){
      return res.send(200);
    }
  });
};

exports.user_orders = function (req, res) {
  var id = req.params.id;
  //获取当前用户的ID{user_id:req.session.user._id}
  db.order.find({user_id:id}).sort({time:-1}).toArray(function (err, result) {
    if (!err) {
      res.render('admin/user/orders', {orders:result});
    }
    ;
  });
};


exports.user_isAdmin = function(req, res){
  var id = req.params.id;
  db.user.findOne({"_id": db.ObjectID.createFromHexString(id)},function (err, user){
    if(user.isAdmin){
      user.isAdmin = false;
    }else{
      user.isAdmin = true;
    }
    delete user._id;
    db.user.update({"_id": db.ObjectID.createFromHexString(id)},{'$set': user},function (err, result){
      if(!err) {
        console.log(user);
        return res.send(user.isAdmin);
      }
    });
  });
}

exports.user_operateShop = function(req, res){
  var id = req.params.id;
   db.user.findOne({"_id": db.ObjectID.createFromHexString(id) },function (err, user){
    if(user.canOperateShop){
      user.canOperateShop = false;
    }else{
      user.canOperateShop = true;
    }
    delete user._id;
    db.user.update({"_id": db.ObjectID.createFromHexString(id)},{'$set': user},function (err, result){
      if(!err) {
        return res.send(user.canOperateShop);
      }
    });
  });
} 