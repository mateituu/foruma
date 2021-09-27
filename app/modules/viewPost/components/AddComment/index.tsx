import { useFormik } from 'formik';
import { useApolloClient } from '@apollo/client';
import { showSuccessNotification } from 'app/common/utilities/notifications';
import useAuth from 'app/common/hooks/useAuth';
import { GetPostQuery, GetPostQueryVariables, useCommentOnPostMutation } from 'app/graphql';
import { processErrorAndLogToServer } from 'app/common/utilities/errorService';
import { GET_POST } from 'schemas/graphqlQueries';

interface IAddCommentProps {
	postId?: string | string[];
}

export default function AddComment({ postId }: IAddCommentProps) {
	const { authUser } = useAuth();
	const [mutation] = useCommentOnPostMutation();
	const client = useApolloClient();
	const { handleChange, handleSubmit, values, resetForm } = useFormik({
		initialValues: { body: '' },
		onSubmit,
	});

	async function onSubmit() {
		if (typeof postId !== 'string') return;
		const response = await mutation({ variables: { data: { body: values.body, postId } } });
		if (response.errors) processErrorAndLogToServer(response.errors);
		if (response.data) {
			const cachedPost = client.readQuery<GetPostQuery, GetPostQueryVariables>({
				query: GET_POST,
				variables: { data: { postId } },
			});
			if (!cachedPost) return;
			const updatedPost = {
				...cachedPost.getPost,
				comments: [response.data.commentOnPost, ...cachedPost.getPost.comments],
			};
			client.writeQuery<GetPostQuery, GetPostQueryVariables>({
				query: GET_POST,
				data: { getPost: updatedPost },
				variables: { data: { postId } },
			});
			showSuccessNotification('Comment added');
			resetForm();
		}
	}
	return !authUser ? null : (
		<form onSubmit={handleSubmit}>
			<textarea name="body" onChange={handleChange} value={values.body} id="body"></textarea>
			<button type="submit">Post</button>
		</form>
	);
}
