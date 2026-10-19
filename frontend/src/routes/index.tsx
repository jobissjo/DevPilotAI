import { createFileRoute } from "@tanstack/react-router";
import { DevPilotApp } from "../components/devpilot-app";

export const Route = createFileRoute("/")({ component: DevPilotApp });
