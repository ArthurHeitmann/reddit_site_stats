import express, {Express} from "express";

export class Server {
	app: Express;

	constructor() {
		this.app = express();
	}
}
