import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "./client";
import { generateTokenSet } from "./util/token";
import cookieParser from "cookie-parser";
import { v4 as uuid } from 'uuid';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.post( '/signup', async( req: Request, res: Response ) => {
    const { username, password }  = req.body;
    if ( !username || !password ) return res.status( 400 ).json( { "error" : "Username and password are required."})
    await prisma.user.create( {
        data: {
            username,
            password: bcrypt.hashSync(password, 10),
        }
    })
    res.sendStatus( 200 );
});

app.post( '/signin', async( req: Request, res: Response ) => {
    const cookies = req.cookies; 
    console.log(`cookie available at login: ${JSON.stringify(cookies)}`);
    const { username, password } = req.body;
    if ( !username || !password ) return res.status( 400 ).json( { "error" : "Username and password are required."})

    const foundUser = await prisma.user.findFirst( { 
        where: { 
            username 
        }, 
        include: { 
            refreshTokens: true 
        } } );
    if ( !foundUser ) return res.status( 400 ).json( { "error" : "User not found." })
    const match = await bcrypt.compare(password, foundUser!.password);
    if ( match ) {
        const { accessToken, refreshToken } = generateTokenSet({ username });
        const newRefreshToken = { 
            id: uuid(),
            token: refreshToken
        }
        let refreshTokenArray = !cookies?.jwt ? 
                                foundUser.refreshTokens : 
                                foundUser.refreshTokens.filter( rt => rt.token !== cookies.jwt );
        if ( cookies?.jwt ) {
            await prisma.refreshToken.deleteMany( {
                where: {
                    userId: {
                        contains: foundUser.id
                    }
                }
            })

            await prisma.user.update({
                where: {
                    id: foundUser.id,
                },
                data: {
                    refreshTokens: {
                        set: [],
                    },
                },
            });
            res.clearCookie('jwt', { httpOnly: true, sameSite:'none'});
            return res.sendStatus(403);
        }

        await prisma.user.update({
            where: {
              id: foundUser.id,
            },
            data: {
              refreshTokens: {
                set: [...refreshTokenArray],
                create: [ newRefreshToken ]
              },
            },
        });

        res.cookie('jwt', refreshToken, { httpOnly: true, sameSite:'none', maxAge: 24 * 60 * 60 * 1000 });
        res.json({ accessToken });

    } else {
        res.sendStatus(401);
    }

});

app.listen( port, () => {
    console.log( `server start on port ${port}`);
});
