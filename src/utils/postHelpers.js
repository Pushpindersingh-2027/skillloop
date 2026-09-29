function timeAgo(date) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (sec < 60) return 'just now';

  const min = Math.floor(sec / 60);
  if (min < 60) {
    return min + (min === 1 ? ' minute ago' : ' minutes ago');
  }

  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return hr + (hr === 1 ? ' hour ago' : ' hours ago');
  }

  const day = Math.floor(hr / 24);
  if (day < 30) {
    return day + (day === 1 ? ' day ago' : ' days ago');
  }

  const mo = Math.floor(day / 30);
  if (mo < 12) {
    return mo + (mo === 1 ? ' month ago' : ' months ago');
  }

  return Math.floor(mo / 12) + ' year(s) ago';
}

function shortName(author) {
  if (!author || !author.firstName) {
    return 'SkillLoop User';
  }

  if (author.accountStatus === 'deleted') {
    return 'Deleted User';
  }

  const last = author.lastName ? ' ' + author.lastName.charAt(0).toUpperCase() + '.' : '';

  return author.firstName + last;
}

module.exports = {
  timeAgo,
  shortName,
};
