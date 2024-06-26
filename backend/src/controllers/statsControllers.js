import prisma from "../lib/prisma.js";
import asyncHandler from "express-async-handler";

const saveStats = asyncHandler(async (req, res) => {
  const { minutes } = req.body;
  try {
    const user = await prisma.User.findUnique({
      where: {
        id: req.user.id,
      },
    });
    if (!user) {
      return res.status(404).send("User not found");
    }
    const stats1 = await prisma.Stats.findMany({
      where: {
        userId: req.user.id,
      },
    });

    const stats = stats1[0];
    let today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (stats) {
      let newStreak = stats.streak;
      if (
        today - stats.date >= 24 * 60 * 60 * 1000 &&
        today - stats.date < 2 * 24 * 60 * 60 * 1000
      ) {
        newStreak = stats.streak + 1;
      } else if (today - stats.date >= 2 * 24 * 60 * 60 * 1000) {
        newStreak = 1;
      }
      await prisma.Stats.update({
        where: {
          id: stats.id,
        },
        data: {
          totalTimeStudied: stats.totalTimeStudied + Number(minutes),
          maxTimeStudied: Math.max(stats.maxTimeStudied, Number(minutes)),
          date: today,
          streak: newStreak,
        },
      });
    } else {
      await prisma.Stats.create({
        data: {
          totalTimeStudied: Number(minutes),
          maxTimeStudied: Number(minutes),
          date: today,
          streak: 1,
          user: {
            connect: {
              id: req.user.id,
            },
          },
        },
      });
    }

    await prisma.History.create({
      data: {
        timeStudied: Number(minutes),
        date: new Date(),
        user: {
          connect: {
            id: req.user.id,
          },
        },
      },
    });

    const updatedStats = await prisma.Stats.findMany({
      where: {
        userId: req.user.id,
      },
    });
    res.send(updatedStats[0]);
  } catch (error) {
    console.error("Error saving stats:", error);
    res.status(500).send("Error saving stats");
  }
});

const fetchStats = asyncHandler(async (req, res) => {
  const id = req.params.id;
  try {
    const user = await prisma.User.findUnique({
      where: {
        username: id,
      },
    });
    if (!user) {
      return res.status(404).send("User not found");
    }
    const stats = await prisma.Stats.findMany({
      where: {
        userId: user.id,
      },
    });
    res.json(stats[0]);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).send("Error fetching stats");
  }
});

const fetchHistory = asyncHandler(async (req, res) => {
  const id = req.params.id;
  try {
    const user = await prisma.User.findUnique({
      where: {
        username: id,
      },
    });
    if (!user) {
      return res.status(404).send("User not found");
    }
    const history = await prisma.History.findMany({
      where: {
        userId: user.id,
      },
    });
    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).send("Error fetching history");
  }
});

const fetchBulkData = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(422).json({ error: "Please add all the fields" });
  }
  try {
    const stats = await prisma.History.findUnique({
      where: {
        username,
      },
      select: {
        date: true,
        timeStudied: true,
      },
    });
    res.json({
      date: stats.date,
      timeStudied: stats.timeStudied,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export { saveStats, fetchStats, fetchHistory, fetchBulkData };
