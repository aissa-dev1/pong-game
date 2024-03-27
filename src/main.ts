const c = document.querySelector<HTMLCanvasElement>("#game_canvas")!;

c.width = window.innerWidth / 2;
c.height = window.innerHeight / 2;

enum BallDirection {
  Left,
  Right,
}

enum PaddleDirection {
  Up,
  Down,
}

enum BallDeviation {
  Up,
  Down,
}

interface RectangleHitBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

class PongGame {
  private _w: number;
  private _h: number;
  private _gameStarted = false;
  private _leftScore = new Score(75, 75);
  private _rightScore: Score;
  private _animationId = 0;

  private _ball: Ball;
  private _leftPaddle: Paddle;
  private _rightPaddle: Paddle;
  private _ctx: CanvasRenderingContext2D;

  constructor(private _canvas: HTMLCanvasElement) {
    this._w = this._canvas.width;
    this._h = this._canvas.height;
    this._ball = new Ball(this._w / 2, this._h / 2);
    this._leftPaddle = new Paddle(15, this._h * 0.5 - 75 * 0.5);
    this._rightPaddle = new Paddle(this._w - 15 - 15, this._h * 0.5 - 75 * 0.5);
    this._rightScore = new Score(this._w - 75, 75);
    this._ctx = this._canvas.getContext("2d")!;
  }

  start() {
    document.addEventListener("keyup", (e) => this.inputHandler(e.key));
    window.addEventListener("resize", () => this.handleGameResponsive());

    this._gameStarted = true;

    this.handleGameResponsive();
    this.animate();
  }

  private draw() {
    this._ctx.clearRect(0, 0, this._w, this._h);
    this._ball.draw(this._ctx);
    this._ball.hitBox.draw(this._ctx);
    this._leftPaddle.draw(this._ctx);
    this._leftPaddle.hitBox.draw(this._ctx);
    this._rightPaddle.draw(this._ctx);
    this._rightPaddle.hitBox.draw(this._ctx);
    this._leftScore.draw(this._ctx);
    this._rightScore.draw(this._ctx);
    this._ball.handleBallParticles(this._ctx);
  }

  private update() {
    this._ball.update(this);
    this._leftPaddle.update(game);
    this._rightPaddle.update(game);
  }

  private animate() {
    this.draw();
    this.update();

    this._animationId = requestAnimationFrame(() => this.animate());
  }

  private inputHandler(key: string) {
    switch (key) {
      case "z":
        this._leftPaddle.changeDirection(PaddleDirection.Up);
        break;

      case "s":
        this._leftPaddle.changeDirection(PaddleDirection.Down);
        break;

      case "ArrowUp":
        this._rightPaddle.changeDirection(PaddleDirection.Up);
        break;

      case "ArrowDown":
        this._rightPaddle.changeDirection(PaddleDirection.Down);
        break;
    }
  }

  private handleGameResponsive() {
    if (window.innerWidth <= 992 && window.innerWidth > 600) {
      this._canvas.width = window.innerWidth / 1.5;
      this._w = this._canvas.width;
      this.resetGameProperties();
      return;
    }

    if (window.innerWidth <= 600) {
      this._canvas.width = window.innerWidth;
      this._w = this._canvas.width;
      this.resetGameProperties();
      return;
    }

    this._canvas.width = window.innerWidth / 2;
    this._w = this._canvas.width;
    this.resetGameProperties();
  }

  private resetGameProperties() {
    this._leftPaddle.changeDimensionY(this._h * 0.5 - 75 * 0.5);
    this._leftPaddle.changeDirection(null);
    this._rightPaddle.changeDimensionX(this._w - 15 - 15);
    this._rightPaddle.changeDimensionY(this._h * 0.5 - 75 * 0.5);
    this._rightPaddle.changeDirection(null);
    this._ball.changeDimensionX(this._w / 2);
    this._rightScore.changeDimensionX(this._w - 75);
  }

  get w(): number {
    return this._w;
  }

  get h(): number {
    return this._h;
  }

  get leftPaddle(): Paddle {
    return this._leftPaddle;
  }

  get rightPaddle(): Paddle {
    return this._rightPaddle;
  }

  get leftScore(): Score {
    return this._leftScore;
  }

  get rightScore(): Score {
    return this._rightScore;
  }
}

class Paddle {
  private _w = 15;
  private _h = 75;
  private _speed = 5;
  private _direction: PaddleDirection | null = null;
  private _color = "#333";

  private _hitBox: HitBox;

  constructor(private _x: number, private _y: number) {
    this._hitBox = new HitBox({
      x: this._x,
      y: this._y,
      w: this._w,
      h: this._h,
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.fillStyle = this._color;
    ctx.fillRect(this._x, this._y, this._w, this._h);
    ctx.fill();
    ctx.closePath();
  }

  update(game: PongGame) {
    this.updatePaddlePosition(game);
  }

  changeDimensionX(x: number) {
    this._x = x;
    this._hitBox.options.x = this._x;
  }

  changeDimensionY(y: number) {
    this._y = y;
    this._hitBox.options.y = this._y;
  }

  changeDirection(dir: PaddleDirection | null) {
    this._direction = dir;
  }

  private updatePaddlePosition(game: PongGame) {
    if (this._direction === PaddleDirection.Up) {
      if (this._y <= 0) return;

      this._y -= this._speed;
      this._hitBox.options.y = this._y;
    }

    if (this._direction === PaddleDirection.Down) {
      if (this._y + this._h >= game.h) return;

      this._y += this._speed;
      this._hitBox.options.y = this._y;
    }
  }

  get w(): number {
    return this._w;
  }

  get h(): number {
    return this._h;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get color(): string {
    return this._color;
  }

  get hitBox(): HitBox {
    return this._hitBox;
  }
}

class Ball {
  private _size = 10;
  private _speed = this.randomBallSpeed();
  private _deviationSpeed = this.randomBallDevSpeed();
  private _maxSpeed = 13;
  private _maxDeviationSpeed = 1;
  private _direction = this.randomBallDir();
  private _deviation: BallDeviation | null = null;
  private _color = `hsl(${Math.floor(Math.random() * 100)}, 100%, 50%, 0.8)`;
  private _hue = 0;

  private _hitBox: HitBox;
  private _ballParticles: Particle[] = [];
  private _maxParticlesCount = 25;

  constructor(private _x: number, private _y: number) {
    this._hitBox = new HitBox({
      x: this._x - this._size,
      y: this._y - this._size,
      w: this._size * 2,
      h: this._size * 2,
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.fillStyle = this._color;
    ctx.arc(this._x, this._y, this._size, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  update(game: PongGame) {
    this.updateBallDirectionPosition();
    this.updateBallDeviationPosition();
    this.updateBallCollision(game);
    this.updateBallOutOfScreen(game);
    this.updateBallFillStyle();
  }

  handleBallParticles(ctx: CanvasRenderingContext2D) {
    this._ballParticles.unshift(new Particle(this._x, this._y, this._color));

    for (const particle of this._ballParticles) {
      particle.draw(ctx);
      particle.changeColor(`hsl(${this._hue}, 100%, 50%, 0.8)`);
    }

    if (this._ballParticles.length >= this._maxParticlesCount) {
      this._ballParticles.pop();
    }
  }

  changeDimensionX(x: number) {
    this._x = x;
    this._hitBox.options.x = this._x - this._size;
  }

  private updateBallDirectionPosition() {
    if (this._direction === BallDirection.Left) {
      this._x -= this._speed;
      this._hitBox.options.x = this._x - this._size;
    }

    if (this._direction === BallDirection.Right) {
      this._x += this._speed;
      this._hitBox.options.x = this._x - this._size;
    }
  }

  private updateBallCollision(game: PongGame) {
    if (this._hitBox.collided(game.leftPaddle.hitBox)) {
      this._direction = BallDirection.Right;
      this.adjustBallMovement(game.leftPaddle);
    }

    if (this._hitBox.collided(game.rightPaddle.hitBox)) {
      this._direction = BallDirection.Left;
      this.adjustBallMovement(game.rightPaddle);
    }
  }

  private updateBallDeviationPosition() {
    if (this._deviation === BallDeviation.Up) {
      this._y -= this._deviationSpeed;
      this._hitBox.options.y = this._y - this._size;
    }

    if (this._deviation === BallDeviation.Down) {
      this._y += this._deviationSpeed;
      this._hitBox.options.y = this._y - this._size;
    }
  }

  private updateBallOutOfScreen(game: PongGame) {
    if (this._x <= 0) {
      this.handleBallOutOfScreen(game);
      game.rightScore.increase();
    }

    if (this._x + this._size >= game.w) {
      this.handleBallOutOfScreen(game);
      game.leftScore.increase();
    }

    if (this._y <= 0 || this._y + this._size >= game.h) {
      this.handleBallOutOfScreen(game);
    }
  }

  private updateBallFillStyle() {
    this._hue++;
    this._color = `hsl(${this._hue}, 100%, 50%, 0.8)`;
  }

  private handleBallOutOfScreen(game: PongGame) {
    this._x = game.w / 2;
    this._hitBox.options.x = this._x - this._size;
    this._y = game.h / 2;
    this._hitBox.options.y = this._y - this._size;
    this._direction = this.randomBallDir();
    this._deviation = null;
    this._speed = this.randomBallSpeed();
    this._deviationSpeed = this.randomBallDevSpeed();
  }

  private adjustBallMovement(paddle: Paddle) {
    if (this.allowSpeedIncrease()) this._speed += 0.5;
    if (this.allowDevSpeedIncrease()) this._deviationSpeed += 0.05;

    if (this.deviationCondition(paddle)) {
      this._deviation = BallDeviation.Down;
    } else {
      this._deviation = BallDeviation.Up;
    }
  }

  private randomBallDir(): BallDirection {
    return Math.random() * 1 > 0.5 ? BallDirection.Left : BallDirection.Right;
  }

  private randomBallSpeed(): number {
    return Math.random() * 1 > 0.5 ? 5 : 6;
  }

  private randomBallDevSpeed(): number {
    const randomNum = Math.random() * 1;

    if (randomNum > 0.75) {
      return 0.3;
    }

    if (randomNum > 0.5 && randomNum < 0.75) {
      return 0.4;
    }

    return 0.5;
  }

  private allowSpeedIncrease(): boolean {
    return this._speed < this._maxSpeed;
  }

  private allowDevSpeedIncrease(): boolean {
    return this._deviationSpeed < this._maxDeviationSpeed;
  }

  private deviationCondition(paddle: Paddle): boolean {
    return (
      paddle.hitBox.options.h + paddle.hitBox.options.y / 2 >
      this._hitBox.options.y
    );
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get size(): number {
    return this._size;
  }

  get speed(): number {
    return this._speed;
  }

  get hitBox(): HitBox {
    return this._hitBox;
  }
}

class HitBox {
  constructor(private _options: RectangleHitBox) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.fillStyle = "transparent";
    ctx.fillRect(
      this._options.x,
      this._options.y,
      this._options.w + 5,
      this._options.h + 5
    );
    ctx.fill();
    ctx.closePath();
  }

  collided(hitBox: HitBox): boolean {
    return (
      this._options.x < hitBox._options.x + hitBox._options.w &&
      this._options.x + this._options.w > hitBox._options.x &&
      this._options.y < hitBox._options.y + hitBox._options.h &&
      this._options.y + this._options.h > hitBox._options.y
    );
  }

  get options(): RectangleHitBox {
    return this._options;
  }
}

class Score {
  private _value = 0;

  constructor(private _x: number, private _y: number) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#212121";
    ctx.font = "25px Arial";
    ctx.fillText(this._value.toString(), this._x, this._y);
  }

  increase(by = 1) {
    this._value += by;
  }

  changeDimensionX(x: number) {
    this._x = x;
  }

  changeDimensionY(y: number) {
    this._y = y;
  }
}

class Particle {
  private _size = Math.random() * 7 + 3;

  constructor(private _x: number, private _y: number, private _color: string) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.fillStyle = this._color;
    ctx.arc(this._x, this._y, this._size, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  changeColor(color: string) {
    this._color = color;
  }
}

const game = new PongGame(c);

document.addEventListener("DOMContentLoaded", () => {
  game.start();
});
