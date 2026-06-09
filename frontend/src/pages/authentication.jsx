import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
// import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import Snackbar from '@mui/material/Snackbar';
import { useNavigate } from 'react-router-dom';

const theme = createTheme();

export default function Authentication() {

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");


  const [formState, setFormState] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const navigate = useNavigate();

  const [bg, setBg] = React.useState(
    "https://picsum.photos/1920/1080?blur=2"  // default image
  );

  React.useEffect(() => {
    const url = `https://picsum.photos/seed/${Date.now()}/1920/1080`;

    const img = new Image();
    img.src = url;

    img.onload = () => {
      setBg(url); // ✅ sirf tab set hoga jab load ho jaye
    };

  }, []);

  let handleAuth = async () => {
    try {
      if (formState === 0) {
        let result = await handleLogin(username, password);
        console.log(result);

        if (result) {
          navigate('/home');
        } else {
          setError("Invalid credentials");
        }
      }

      if (formState === 1) {
        let result = await handleRegister(name, username, password);
        console.log(result);
        setUsername("");
        setMessage(result);
        setOpen(true);
        setError("")
        setFormState(0)
        setPassword("")
      }
    } catch (err) {
      let message = (err.response.data.message);
      setError(message);
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    handleAuth();
  };

  return (
    <ThemeProvider theme={theme}>
      <Grid
        container
        component="main"
        sx={{
          height: '100vh',
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >

        {/* <CssBaseline /> */}

        {/* LEFT SIDE IMAGE */}
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            display: { xs: 'none', sm: 'block' },  // ✅ FIX
            backgroundImage: `url(${bg})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: "0.8s ease-in-out"
          }}
        />

        {/* RIGHT SIDE FORM */}
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>

          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >

            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <LockOutlinedIcon />
            </Avatar>

            <div>
              <Button variant={formState === 0 ? "contained" : ""} onClick={() => { setFormState(0) }}>Sign In</Button>
              <Button variant={formState === 1 ? "contained" : ""} onClick={() => { setFormState(1) }}>Sign Up</Button>
            </div>

            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <p>{name}</p>
              {formState === 1 ? <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Fullname"
                name="username"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              /> : <></>
              }

              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                value={username}
                autoFocus
                onChange={(e) => setUsername(e.target.value)}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
              />

              <p style={{ color: "red" }}>{error}</p>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                {formState === 0 ? "Login" : "Register"}
              </Button>

            </Box>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={open}
        autoHideDuration={4000}
        message={message}
      >

      </Snackbar>

    </ThemeProvider>
  );
}