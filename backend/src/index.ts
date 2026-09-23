import "dotenv/config";

import express from "express";
import cors from "cors";

import {
  processAssistantMessage,
} from "./services/assistantService.js";

import {
  deleteConversation,
} from "./services/conversationService.js";

import {
  getProductById,
} from "./services/ektApi.js";

import {
  getCatalogSize,
  searchCatalog,
} from "./services/catalogService.js";

const app = express();

const PORT =
  Number(process.env.PORT) ||
  3001;

app.use(cors());
app.use(express.json());

app.get(
  "/",
  (_req, res) => {
    return res.json({
      name: "EKTiQ API",
      status: "running",
    });
  }
);

app.get(
  "/api/products/:id",
  async (req, res) => {
    try {
      const id =
        Number(
          req.params.id
        );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid product ID",
          });
      }

      const product =
        await getProductById(
          id
        );

      return res.json(
        product
      );
    } catch (error) {
      console.error(
        "Failed to fetch EKT product:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to fetch product from EKT",
        });
    }
  }
);

app.get(
  "/api/catalog",
  (_req, res) => {
    return res.json({
      products:
        getCatalogSize(),
    });
  }
);

app.get(
  "/api/catalog/search",
  (req, res) => {
    try {
      const query =
        typeof req.query.q ===
        "string"
          ? req.query.q
          : "";

      const page =
        Number(
          req.query.page
        ) || 1;

      const limit =
        Number(
          req.query.limit
        ) || 24;

      const results =
        searchCatalog({
          query,
          page,
          limit,
        });

      return res.json(
        results
      );
    } catch (error) {
      console.error(
        "Catalog search failed:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Catalog search failed",
        });
    }
  }
);

app.post(
  "/api/assistant/chat",
  async (req, res) => {
    try {
      const message =
        typeof req.body
          ?.message ===
        "string"
          ? req.body.message
          : "";

      const conversationId =
        typeof req.body
          ?.conversationId ===
        "string"
          ? req.body
              .conversationId
          : undefined;

      if (!message.trim()) {
        return res
          .status(400)
          .json({
            error:
              "message is required",
          });
      }

      const result =
        await processAssistantMessage(
          message,
          conversationId
        );

      return res.json(
        result
      );
    } catch (error) {
      console.error(
        "Assistant error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Assistant request failed",
        });
    }
  }
);

/*
 * Useful for starting a completely
 * new chat from the frontend.
 */
app.delete(
  "/api/assistant/conversations/:id",
  (req, res) => {
    const deleted =
      deleteConversation(
        req.params.id
      );

    return res.json({
      deleted,
    });
  }
);

app.listen(
  PORT,
  () => {
    console.log(
      `⚡ EKTiQ API running on http://localhost:${PORT}`
    );
  }
);