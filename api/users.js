const prisma = require("../db/prisma");
const bcrypt = require("bcrypt");
const { userRequired, adminRequired, generateId } = require("./utils");
const userRouter = require("express").Router();
const SALT_ROUNDS = 10;

// Create   Allows admin to create a new user.
userRouter.post("/", adminRequired, async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      preferred_name,
      gpa,
      address,
      phone,
      password,
      is_admin,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const checkEmail = await prisma.User.findUnique({
      where: {
        email: email,
      },
    });

    if (checkEmail) {
      res.send("A user with that email already exists.");
    }

    const school_id = await generateId(first_name, last_name);

    const user = await prisma.User.create({
      data: {
        first_name,
        last_name,
        email,
        preferred_name,
        gpa: gpa ? gpa : 4.0,
        address,
        phone,
        password: hashedPassword,
        is_admin: is_admin ? is_admin : false,
        school_id,
      },
    });

    delete user.password;

    res.send(user);
  } catch (error) {
    next(error);
  }
});

// Read   Read single user by id, school_id, or email.
//        Returns current user if none of these are provided.
userRouter.get("/", adminRequired, async (req, res, next) => {
  try {
    const { email, id, school_id } = req.body;
    let user;
    if (id) {
      user = await prisma.User.findUnique({
        where: {
          id: +id,
        },
      });
    } else if (school_id) {
      user = await prisma.User.findUnique({
        where: {
          school_id,
        },
      });
    } else if (email) {
      user = await prisma.User.findUnique({
        where: {
          email,
        },
      });
    } else {
      user = req.user;
    }

    if (user) {
      delete user.password;
      res.send(user);
    } else res.send(`No account found.`);
  } catch (error) {
    next(error);
  }
});

// Read   All users
userRouter.get("/all", adminRequired, async (req, res, next) => {
  try {
    const users = await prisma.User.findMany({});
    for (const user of users) {
      delete user.password;
    }
    res.send(users);
  } catch (error) {
    next(error);
  }
});

// Update   Allows user to update their own information
userRouter.patch("/", userRequired, async (req, res, next) => {
  try {
    const user = req.user;
    const id = user.id;
    const { first_name, last_name, preferred_name, address, phone, password } =
      req.body;
    const updatedUser = await prisma.User.update({
      where: {
        id,
      },
      data: {
        first_name: first_name ? first_name : user.first_name,
        last_name: last_name ? last_name : user.last_name,
        preferred_name: preferred_name ? preferred_name : user.preferred_name,
        address: address ? address : user.address,
        phone: phone ? phone : user.phone,
        password: password ? password : user.password,
      },
    });
    delete updatedUser.password;
    res.send(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Update   Allows admin to update any user's information
userRouter.patch("/:id", adminRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.User.findUnique({
      where: {
        id: +id,
      },
    });
    const {
      first_name,
      last_name,
      email,
      preferred_name,
      gpa,
      address,
      phone,
      password,
      is_admin,
    } = req.body;
    const updatedUser = await prisma.User.update({
      where: {
        id: +id,
      },
      data: {
        first_name: first_name ? first_name : user.first_name,
        last_name: last_name ? last_name : user.last_name,
        email: email ? email : user.email,
        preferred_name: preferred_name ? preferred_name : user.preferred_name,
        gpa: gpa ? gpa : user.gpa,
        address: address ? address : user.address,
        phone: phone ? phone : user.phone,
        password: password ? password : user.password,
        is_admin: is_admin || is_admin === false ? is_admin : user.is_admin,
      },
    });
    delete updatedUser.password;
    res.send(updatedUser);
  } catch (error) {
    next(error);
  }
});

//  Delete    Delete user by email or id.
userRouter.delete("/", adminRequired, async (req, res, next) => {
  try {
    const { email, id } = req.body;
    let user;
    if (id) {
      user = await prisma.User.findUnique({
        where: {
          id: +id,
        },
      });
    } else if (email) {
      user = await prisma.User.findUnique({
        where: {
          email: email,
        },
      });
    }
    if (user.id === req.user.id) {
      res.send("You can't delete yourself, dummy.");
    } else {
      await prisma.courseUser.deleteMany({ where: { user_id: user.id } });
      const deletedUser = await prisma.User.delete({
        where: {
          id: user.id,
        },
      });
      delete deletedUser.password;
      res.send(deletedUser);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = userRouter;
