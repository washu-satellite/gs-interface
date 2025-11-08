import { APIRouteMapping } from "@/types/api";
import { db } from "@/db/client"
import { sql } from 'drizzle-orm';

export const API_ROUTES: APIRouteMapping = new Map([
    [["/getTest", 'GET'], async (req, res) => {
        try {
            if(db===undefined){
                res.status(500).send({text: "db undefined"});
                return
                //return Response.json({text: "db undefined"},{status: 500});
            }
            console.log(db)
            const result = db!== undefined ? await db.execute(sql`SELECT * FROM demo`): undefined;
            if(result===undefined){
                res.status(400).send({text: "result undefined"});
                return
                //return Response.json({text: "result undefined"},{status: 400});
            }
            console.log('Query result:', result.rows);
            res.status(200).send({result: result.rows});
            return
            //return Response.json({result: result.rows},{status: 200});
        } catch (error) {
          console.error(error);
          res.status(400).send({text: "query failed"});
          return
          //return Response.json({text: "query failed"},{status: 400});
        }
    }],
    [["/postTest", 'POST'], (req, res) => {
        const body  = req.body;
        if(!body) {
            res.status(418).send({message: 'Please provide a body'});
        }

        res.send({
            body: 'package with body ' + body
        })
    }],
]);