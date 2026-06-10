# ContextIt: Compressed Project Context
<!-- fingerprint: ctx://b16eb8f -->

> [!NOTE]
> **Context Slicing & Cost Reduction Metrics (Est.)**:
> - **Fingerprint**: `ctx://b16eb8f`
> - **Raw Context Size**: ~8,933 tokens
> - **Pruned Context Size**: ~4,840 tokens (**1.8x reduction**)
> - **Gemini 3.5 Flash Cost**: $0.01340 &rarr; $0.00726 (**46% savings**)

## File: `dist/temp_repos/nestjs-realworld/src/app.controller.ts`
```typescript
@Controller()
export class AppController {
    @Get()
    root(): string;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/profile/follows.entity.ts`
```typescript
@Entity('follows')
export class FollowsEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    followerId: number;
    @Column()
    followingId: number;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/profile/profile.interface.ts`
```typescript
export interface ProfileData {
  username: string;
  bio: string;
  image?: string;
  following?: boolean;
}

export interface ProfileRO {
  profile: ProfileData;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/shared/pipes/validation.pipe.ts`
```typescript
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
    async transform(value, metadata: ArgumentMetadata);
    private buildError(errors);
    private toValidate(metatype): boolean;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/tag/tag.entity.ts`
```typescript
@Entity('tag')
export class TagEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    tag: string;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/user/user.decorator.ts`
```typescript
User = createParamDecorator((data: any, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  if (!!req.user) {
    return !!data ? req.user[data] : req.user;
  }

  const token = req.headers.authorization ? (req.headers.authorization as string).split(' ') : null;
  if (token && token[1]) {
    const decoded: any = jwt.verify(token[1], SECRET);
    return !!data ? decoded[data] : decoded.user;
  }
})

```

## File: `dist/temp_repos/nestjs-realworld/src/user/user.interface.ts`
```typescript
export interface UserData {
  username: string;
  email: string;
  token: string;
  bio: string;
  image?: string;
}

export interface UserRO {
  user: UserData;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/article/article.entity.ts`
```typescript
import { UserEntity } from '../user/user.entity';
import { Comment } from './comment.entity';

@Entity('article')
export class ArticleEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    slug: string;
    @Column()
    title: string;
    @Column({ default: '' })
    description: string;
    @Column({ default: '' })
    body: string;
    @Column({ type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    created: Date;
    @Column({ type: 'timestamp', default: () => "CURRENT_TIMESTAMP" })
    updated: Date;
    @BeforeUpdate()
    updateTimestamp();
    @Column('simple-array')
    tagList: string[];
    @ManyToOne(type => UserEntity, user => user.articles)
    author: UserEntity;
    @OneToMany(type => Comment, comment => comment.article, { eager: true })
    @JoinColumn()
    comments: Comment[];
    @Column({ default: 0 })
    favoriteCount: number;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/article/article.interface.ts`
```typescript
import { UserData } from '../user/user.interface';
import { ArticleEntity } from './article.entity';

interface Comment {
  body: string;
}

export interface CommentsRO {
  comments: Comment[];
}

export interface ArticleRO {
  article: ArticleEntity;
}

export interface ArticlesRO {
  articles: ArticleEntity[];
  articlesCount: number;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/article/comment.entity.ts`
```typescript
import { ArticleEntity } from './article.entity';

@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    body: string;
    @ManyToOne(type => ArticleEntity, article => article.comments)
    article: ArticleEntity;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/tag/tag.service.ts`
```typescript
import { TagEntity } from './tag.entity';

@Injectable()
export class TagService {
    constructor(
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>);
    async findAll(): Promise<TagEntity[]>;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/user/auth.middleware.ts`
```typescript
import { UserService } from './user.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(private readonly userService: UserService);
    async use(req: Request, res: Response, next: NextFunction);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/user/user.entity.ts`
```typescript
import { ArticleEntity } from '../article/article.entity';

@Entity('user')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    username: string;
    @Column()
    @IsEmail()
    email: string;
    @Column({ default: '' })
    bio: string;
    @Column({ default: '' })
    image: string;
    @Column()
    password: string;
    @BeforeInsert()
    async hashPassword();
    @ManyToMany(type => ArticleEntity)
    @JoinTable()
    favorites: ArticleEntity[];
    @OneToMany(type => ArticleEntity, article => article.author)
    articles: ArticleEntity[];
}

```

## File: `dist/temp_repos/nestjs-realworld/src/user/user.module.ts`
```typescript
import { UserController } from './user.controller';
import { UserEntity } from './user.entity';
import { UserService } from './user.service';
import { AuthMiddleware } from './auth.middleware';

@Module({
    imports: [TypeOrmModule.forFeature([UserEntity])],
    providers: [UserService],
    controllers: [
        UserController
    ],
    exports: [UserService]
})
export class UserModule implements NestModule {
    public configure(consumer: MiddlewareConsumer);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/user/user.service.ts`
```typescript
import { UserEntity } from './user.entity';
import { UserRO } from './user.interface';

@Injectable()
export class UserService {
    constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>);
    async findAll(): Promise<UserEntity[]>;
    async findOne({ email, password }: LoginUserDto): Promise<UserEntity>;
    async create(dto: CreateUserDto): Promise<UserRO>;
    async update(id: number, dto: UpdateUserDto): Promise<UserEntity>;
    async delete(email: string): Promise<DeleteResult>;
    async findById(id: number): Promise<UserRO>;
    async findByEmail(email: string): Promise<UserRO>;
    public generateJWT(user);
    ;
    private buildUserRO(user: UserEntity);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/app.module.ts`
```typescript
import { AppController } from './app.controller';
import { ArticleModule } from './article/article.module';
import { UserModule } from './user/user.module';
import { ProfileModule } from './profile/profile.module';
import { TagModule } from './tag/tag.module';

@Module({
    imports: [
        TypeOrmModule.forRoot(),
        ArticleModule,
        UserModule,
        ProfileModule,
        TagModule
    ],
    controllers: [
        AppController
    ],
    providers: []
})
export class ApplicationModule {
    constructor(private readonly connection: Connection);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/article/article.controller.ts`
```typescript
import { ArticleService } from './article.service';
import { ArticlesRO, ArticleRO } from './article.interface';
import { CommentsRO } from './article.interface';
import { User } from '../user/user.decorator';

@ApiBearerAuth()
@ApiTags('articles')
@Controller('articles')
export class ArticleController {
    constructor(private readonly articleService: ArticleService);
    @ApiOperation({ summary: 'Get all articles' })
    @ApiResponse({ status: 200, description: 'Return all articles.' })
    @Get()
    async findAll(
    @Query()
    query): Promise<ArticlesRO>;
    @ApiOperation({ summary: 'Get article feed' })
    @ApiResponse({ status: 200, description: 'Return article feed.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @Get('feed')
    async getFeed(
    @User('id')
    userId: number, 
    @Query()
    query): Promise<ArticlesRO>;
    @Get(':slug')
    async findOne(
    @Param('slug')
    slug): Promise<ArticleRO>;
    @Get(':slug/comments')
    async findComments(
    @Param('slug')
    slug): Promise<CommentsRO>;
    @ApiOperation({ summary: 'Create article' })
    @ApiResponse({ status: 201, description: 'The article has been successfully created.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @Post()
    async create(
    @User('id')
    userId: number, 
    @Body('article')
    articleData: CreateArticleDto);
    @ApiOperation({ summary: 'Update article' })
    @ApiResponse({ status: 201, description: 'The article has been successfully updated.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @Put(':slug')
    async update(
    @Param()
    params, 
    @Body('article')
    articleData: CreateArticleDto);
    @ApiOperation({ summary: 'Delete article' })
    @ApiResponse({ status: 201, description: 'The article has been successfully deleted.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @Delete(':slug')
    async delete(
    @Param()
    params);
    @ApiOperation({ summary: 'Create comment' })
    @ApiResponse({ status: 201, description: 'The comment has been successfully created.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @Post(':slug/comments')
    async createComment(
    @Param('slug')
    slug, 
    @Body('comment')
    commentData: CreateCommentDto);
    @ApiOperation({ summary: 'Delete comment' })
    @ApiResponse({ status: 201, description: 'The article has been successfully deleted.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @Delete(':slug/comments/:id')
    async deleteComment(
    @Param()
    params);
    @ApiOperation({ summary: 'Favorite article' })
    @ApiResponse({ status: 201, description: 'The article has been successfully favorited.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @Post(':slug/favorite')
    async favorite(
    @User('id')
    userId: number, 
    @Param('slug')
    slug);
    @ApiOperation({ summary: 'Unfavorite article' })
    @ApiResponse({ status: 201, description: 'The article has been successfully unfavorited.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @Delete(':slug/favorite')
    async unFavorite(
    @User('id')
    userId: number, 
    @Param('slug')
    slug);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/article/article.module.ts`
```typescript
import { ArticleController } from './article.controller';
import { ArticleEntity } from './article.entity';
import { Comment } from './comment.entity';
import { UserEntity } from '../user/user.entity';
import { FollowsEntity } from '../profile/follows.entity';
import { ArticleService } from './article.service';
import { AuthMiddleware } from '../user/auth.middleware';
import { UserModule } from '../user/user.module';

@Module({
    imports: [TypeOrmModule.forFeature([ArticleEntity, Comment, UserEntity, FollowsEntity]), UserModule],
    providers: [ArticleService],
    controllers: [
        ArticleController
    ]
})
export class ArticleModule implements NestModule {
    public configure(consumer: MiddlewareConsumer);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/article/article.service.ts`
```typescript
import { ArticleEntity } from './article.entity';
import { Comment } from './comment.entity';
import { UserEntity } from '../user/user.entity';
import { FollowsEntity } from '../profile/follows.entity';
import { ArticleRO, ArticlesRO, CommentsRO } from './article.interface';

slug = require('slug')

@Injectable()
export class ArticleService {
    constructor(
    @InjectRepository(ArticleEntity)
    private readonly articleRepository: Repository<ArticleEntity>, 
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>, 
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>, 
    @InjectRepository(FollowsEntity)
    private readonly followsRepository: Repository<FollowsEntity>);
    async findAll(query): Promise<ArticlesRO>;
    async findFeed(userId: number, query): Promise<ArticlesRO>;
    async findOne(where): Promise<ArticleRO>;
    async addComment(slug: string, commentData): Promise<ArticleRO>;
    async deleteComment(slug: string, id: string): Promise<ArticleRO>;
    async favorite(id: number, slug: string): Promise<ArticleRO>;
    async unFavorite(id: number, slug: string): Promise<ArticleRO>;
    async findComments(slug: string): Promise<CommentsRO>;
    async create(userId: number, articleData: CreateArticleDto): Promise<ArticleEntity>;
    async update(slug: string, articleData: any): Promise<ArticleRO>;
    async delete(slug: string): Promise<DeleteResult>;
    slugify(title: string);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/profile/profile.controller.ts`
```typescript
import { ProfileService } from './profile.service';
import { ProfileRO } from './profile.interface';
import { User } from '../user/user.decorator';

@ApiBearerAuth()
@ApiTags('profiles')
@Controller('profiles')
export class ProfileController {
    constructor(private readonly profileService: ProfileService);
    @Get(':username')
    async getProfile(
    @User('id')
    userId: number, 
    @Param('username')
    username: string): Promise<ProfileRO>;
    @Post(':username/follow')
    async follow(
    @User('email')
    email: string, 
    @Param('username')
    username: string): Promise<ProfileRO>;
    @Delete(':username/follow')
    async unFollow(
    @User('id')
    userId: number, 
    @Param('username')
    username: string): Promise<ProfileRO>;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/profile/profile.module.ts`
```typescript
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserModule } from '../user/user.module';
import { UserEntity } from '../user/user.entity';
import { FollowsEntity } from './follows.entity';
import { AuthMiddleware } from '../user/auth.middleware';

@Module({
    imports: [TypeOrmModule.forFeature([UserEntity, FollowsEntity]), UserModule],
    providers: [ProfileService],
    controllers: [
        ProfileController
    ],
    exports: []
})
export class ProfileModule implements NestModule {
    public configure(consumer: MiddlewareConsumer);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/profile/profile.service.ts`
```typescript
import { UserEntity } from '../user/user.entity';
import { ProfileRO, ProfileData } from './profile.interface';
import { FollowsEntity } from './follows.entity';

@Injectable()
export class ProfileService {
    constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>, 
    @InjectRepository(FollowsEntity)
    private readonly followsRepository: Repository<FollowsEntity>);
    async findAll(): Promise<UserEntity[]>;
    async findOne(options?: DeepPartial<UserEntity>): Promise<ProfileRO>;
    async findProfile(id: number, followingUsername: string): Promise<ProfileRO>;
    async follow(followerEmail: string, username: string): Promise<ProfileRO>;
    async unFollow(followerId: number, username: string): Promise<ProfileRO>;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/tag/tag.controller.ts`
```typescript
import { TagEntity } from './tag.entity';
import { TagService } from './tag.service';

@ApiBearerAuth()
@ApiTags('tags')
@Controller('tags')
export class TagController {
    constructor(private readonly tagService: TagService);
    @Get()
    async findAll(): Promise<TagEntity[]>;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/tag/tag.module.ts`
```typescript
import { UserModule } from '../user/user.module';
import { TagService } from './tag.service';
import { TagEntity } from './tag.entity';
import { TagController } from './tag.controller';

@Module({
    imports: [TypeOrmModule.forFeature([TagEntity]), UserModule],
    providers: [TagService],
    controllers: [
        TagController
    ],
    exports: []
})
export class TagModule implements NestModule {
    public configure(consumer: MiddlewareConsumer);
}

```

## File: `dist/temp_repos/nestjs-realworld/src/user/user.controller.ts`
```typescript
import { UserService } from './user.service';
import { UserRO } from './user.interface';
import { User } from './user.decorator';
import { ValidationPipe } from '../shared/pipes/validation.pipe';

@ApiBearerAuth()
@ApiTags('user')
@Controller()
export class UserController {
    constructor(private readonly userService: UserService);
    @Get('user')
    async findMe(
    @User('email')
    email: string): Promise<UserRO>;
    @Put('user')
    async update(
    @User('id')
    userId: number, 
    @Body('user')
    userData: UpdateUserDto);
    @UsePipes(new ValidationPipe())
    @Post('users')
    async create(
    @Body('user')
    userData: CreateUserDto);
    @Delete('users/:slug')
    async delete(
    @Param()
    params);
    @UsePipes(new ValidationPipe())
    @Post('users/login')
    async login(
    @Body('user')
    loginUserDto: LoginUserDto): Promise<UserRO>;
}

```

## File: `dist/temp_repos/nestjs-realworld/src/main.ts`
```typescript
import { ApplicationModule } from './app.module';

async function bootstrap() {
  const appOptions = {cors: true};
  const app = await NestFactory.create(ApplicationModule, appOptions);
  app.setGlobalPrefix('api');

  const options = new DocumentBuilder()
    .setTitle('NestJS Realworld Example App')
    .setDescription('The Realworld API description')
    .setVersion('1.0')
    .setBasePath('api')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/docs', app, document);

  await app.listen(3000);
}

```

